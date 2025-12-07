import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SearchOrdersDto } from './dto/search-orders.dto';
import { PrismaService } from '../modules/prisma/prisma.service';
import { EmailService } from '../modules/email/email.service';
import { LegalService } from '../legal/legal.service';

@Injectable()
export class DirectorOrdersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
        private readonly legalService: LegalService,
    ) { }

    async searchOrders(query: SearchOrdersDto) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const skip = (page - 1) * pageSize;

        const where: Prisma.OrderWhereInput = {};

        if (query.orderId) {
            where.id = query.orderId;
        }

        if (query.email) {
            where.buyer = {
                email: query.email,
            };
        }

        if (query.eventId) {
            where.eventId = query.eventId;
        }

        if (query.organizerId) {
            where.event = {
                organizerId: query.organizerId,
            };
        }

        if (query.status) {
            where.status = query.status;
        }

        const [total, orders] = await Promise.all([
            this.prisma.order.count({ where }),
            this.prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
                include: {
                    buyer: true,
                    event: {
                        include: {
                            organizer: true,
                        },
                    },
                    payment: true,
                },
            }),
        ]);

        return {
            data: orders,
            meta: {
                page,
                pageSize,
                total,
            },
        };
    }

    async getOrderDetail(orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: true,
                event: {
                    include: { organizer: true },
                },
                payment: true,
                tickets: true,
                items: {
                    include: {
                        template: true,
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const logs = await this.legalService.findLogsByOrder(orderId);

        return {
            order,
            logs,
        };
    }

    async resendTickets(orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: true,
                event: true,
                tickets: true,
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (!order.buyer?.email) {
            throw new BadRequestException('Order has no buyer email');
        }

        await this.emailService.resendTickets(order.id);

        return { status: 'sent' };
    }
}
