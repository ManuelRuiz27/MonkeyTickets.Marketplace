import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ORDER_FULFILLMENT_JOB, ORDER_FULFILLMENT_QUEUE } from './payment.constants';
import { PrismaService } from '../modules/prisma/prisma.service';
import { EmailService } from '../modules/email/email.service';

@Processor(ORDER_FULFILLMENT_QUEUE)
export class OrderFulfillmentProcessor {
    private readonly logger = new Logger(OrderFulfillmentProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
    ) { }

    @Process(ORDER_FULFILLMENT_JOB)
    async handle(job: Job<{ orderId: string }>) {
        const { orderId } = job.data;
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: { template: true },
                },
                buyer: true,
                event: true,
            },
        });

        if (!order) {
            this.logger.warn(`Order ${orderId} not found; skipping fulfillment`);
            return;
        }

        const existingTickets = await this.prisma.ticket.findMany({
            where: { orderId },
        });

        if (existingTickets.length > 0) {
            this.logger.log(`Order ${orderId} already has ${existingTickets.length} tickets; resending email`);
            await this.emailService.sendTicketsEmail(orderId);
            return;
        }

        if (!order.items.length) {
            this.logger.error(`Order ${orderId} has no items; cannot generate tickets`);
            return;
        }

        await this.prisma.$transaction(async (tx) => {
            for (const item of order.items) {
                if (item.quantity <= 0) {
                    continue;
                }

                const ticketsData = Array.from({ length: item.quantity }).map((_, index) => ({
                    orderId: order.id,
                    templateId: item.templateId,
                    qrCode: `TICKET-${order.id}-${item.templateId}-${Date.now()}-${index}`,
                }));

                await tx.ticket.createMany({
                    data: ticketsData,
                });

                await tx.ticketTemplate.update({
                    where: { id: item.templateId },
                    data: {
                        sold: { increment: item.quantity },
                        quantity: { decrement: item.quantity },
                    },
                });
            }
        });

        const tickets = await this.prisma.ticket.findMany({
            where: { orderId },
        });

        await this.emailService.sendTicketsEmail(orderId);
        this.logger.log(`Order ${orderId} fulfillment completed`);
    }
}
