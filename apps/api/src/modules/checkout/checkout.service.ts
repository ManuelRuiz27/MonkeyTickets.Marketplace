import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Injectable()
export class CheckoutService {
    constructor(private prisma: PrismaService) { }

    async processCheckout(data: CreateCheckoutDto) {
        // 1. Validar evento y template
        const template = await this.prisma.ticketTemplate.findUnique({
            where: { id: data.templateId },
            include: { event: true },
        });

        if (!template) {
            throw new NotFoundException('Ticket template not found');
        }

        if (template.eventId !== data.eventId) {
            throw new BadRequestException('Template does not belong to this event');
        }

        // Validaciones de Negocio
        if (template.event?.status !== 'PUBLISHED') {
            throw new BadRequestException('Event is not available for purchase');
        }

        if (template.event?.endDate && new Date() > template.event.endDate) {
            throw new BadRequestException('Event has ended');
        }

        if (template.quantity < data.quantity) {
            throw new BadRequestException('Not enough tickets available');
        }

        // Ejecutar transacción para asegurar integridad y stock
        return this.prisma.$transaction(async (tx) => {
            // Re-verificar stock dentro de la transacción (bloqueo optimista simple)
            const currentTemplate = await tx.ticketTemplate.findUnique({
                where: { id: template.id },
            });

            if (!currentTemplate || currentTemplate.quantity < data.quantity) {
                throw new BadRequestException('Tickets sold out during processing');
            }

            // 2. Calcular total
            const total = Number(template.price) * data.quantity;

            // 3. Crear o buscar comprador
            let buyer = await tx.buyer.findFirst({
                where: { email: data.email },
            });

            if (!buyer) {
                buyer = await tx.buyer.create({
                    data: {
                        email: data.email,
                        name: data.name,
                        phone: data.phone,
                    },
                });
            }

            // 4. Crear Orden
            const order = await tx.order.create({
                data: {
                    eventId: data.eventId,
                    buyerId: buyer.id,
                    status: 'PAID',
                    total: total,
                    currency: template.currency,
                    paidAt: new Date(),
                },
            });

            // 5. Crear Pago (Simulado)
            await tx.payment.create({
                data: {
                    orderId: order.id,
                    gateway: 'CONEKTA',
                    amount: total,
                    currency: template.currency,
                    status: 'COMPLETED',
                    gatewayTransactionId: `sim_${Date.now()}`,
                    paymentMethod: 'card',
                },
            });

            // 6. Generar Tickets
            const tickets = [];
            for (let i = 0; i < data.quantity; i++) {
                tickets.push({
                    orderId: order.id,
                    templateId: template.id,
                    qrCode: `TICKET-${order.id}-${i + 1}`,
                    status: 'VALID',
                });
            }

            await tx.ticket.createMany({
                data: tickets as any,
            });

            // Recuperar los IDs de los tickets creados
            const createdTickets = await tx.ticket.findMany({
                where: { orderId: order.id },
                select: { id: true, qrCode: true }
            });

            // 7. Actualizar inventario
            await tx.ticketTemplate.update({
                where: { id: template.id },
                data: {
                    sold: { increment: data.quantity },
                    quantity: { decrement: data.quantity },
                },
            });

            return {
                success: true,
                orderId: order.id,
                tickets: createdTickets,
                message: 'Purchase completed successfully',
            };
        });
    }
}
