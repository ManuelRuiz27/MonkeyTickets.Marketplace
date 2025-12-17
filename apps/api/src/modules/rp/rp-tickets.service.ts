import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfGeneratorService } from '../tickets/pdf-generator.service';
import { OrderStatus, TicketStatus } from '@prisma/client';

export interface GenerateRPTicketDto {
    name: string;
    email: string;
    phone?: string;
}

@Injectable()
export class RPTicketsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly pdfGenerator: PdfGeneratorService,
    ) { }

    /**
     * Generar boleto (cortesía) desde un RP
     */
    async generateRPTicket(rpCode: string, guestData: GenerateRPTicketDto) {
        // 1. Buscar RP
        const rp = await this.prisma.rP.findUnique({
            where: { code: rpCode },
            include: {
                event: {
                    include: {
                        templates: {
                            where: { isComplimentary: true },
                            take: 1,
                        },
                    },
                },
            },
        });

        if (!rp) {
            throw new NotFoundException('Código de RP inválido');
        }

        // 2. Verificar que el RP está activo
        if (!rp.isActive) {
            throw new BadRequestException(
                'Este RP está desactivado. Contacta al organizador.',
            );
        }

        // 3. Verificar límites si existen
        if (rp.maxTickets !== null && rp.ticketsGenerated >= rp.maxTickets) {
            throw new BadRequestException(
                `Este RP ha alcanzado su límite de ${rp.maxTickets} boletos.`,
            );
        }

        // 4. Verificar que el evento está publicado
        if (rp.event.status !== 'PUBLISHED') {
            throw new BadRequestException('El evento aún no está disponible.');
        }

        // 5. Buscar o crear plantilla de cortesía
        let template = rp.event.templates[0];

        if (!template) {
            // Crear plantilla de cortesía para el evento si no existe
            template = await this.prisma.ticketTemplate.create({
                data: {
                    organizerId: rp.event.organizerId,
                    eventId: rp.event.id,
                    name: 'Cortesía RP',
                    description: 'Boleto cortesía generado por RP',
                    price: 0,
                    currency: 'MXN',
                    quantity: 9999, // Cantidad grande para cortesías
                    sold: 0,
                    isComplimentary: true,
                },
            });
        }

        // 6. Crear o buscar Buyer
        let buyer = await this.prisma.buyer.findFirst({
            where: { email: guestData.email },
        });

        if (!buyer) {
            buyer = await this.prisma.buyer.create({
                data: {
                    email: guestData.email,
                    name: guestData.name,
                    phone: guestData.phone,
                },
            });
        }

        // 7. Crear Order (status PAID para cortesías)
        const order = await this.prisma.order.create({
            data: {
                eventId: rp.event.id,
                buyerId: buyer.id,
                status: OrderStatus.PAID,
                total: 0, // Cortesía gratuita
                currency: 'MXN',
                platformFeeAmount: 0,
                organizerIncomeAmount: 0,
                paidAt: new Date(),
            },
        });

        // 8. Crear OrderItem
        await this.prisma.orderItem.create({
            data: {
                orderId: order.id,
                templateId: template.id,
                quantity: 1,
                unitPrice: 0,
                currency: 'MXN',
            },
        });

        // 9. Generar código único para el ticket
        const qrCode = this.generateTicketCode(order.id, template.id, rp.code);

        // 10. Crear Ticket vinculado al RP
        const ticket = await this.prisma.ticket.create({
            data: {
                orderId: order.id,
                templateId: template.id,
                rpId: rp.id,
                qrCode,
                status: TicketStatus.VALID,
            },
        });

        // 11. Incrementar contador de tickets generados del RP
        await this.prisma.rP.update({
            where: { id: rp.id },
            data: {
                ticketsGenerated: { increment: 1 },
            },
        });

        // 12. Incrementar sold en template
        await this.prisma.ticketTemplate.update({
            where: { id: template.id },
            data: {
                sold: { increment: 1 },
            },
        });

        // 13. Generar PDF con QR
        const pdfBuffer = await this.pdfGenerator.generateTicketPdf(ticket.id);

        return {
            ticket: {
                id: ticket.id,
                qrCode: ticket.qrCode,
            },
            guest: {
                name: buyer.name,
                email: buyer.email,
            },
            rp: {
                name: rp.name,
                code: rp.code,
            },
            event: {
                title: rp.event.title,
                startDate: rp.event.startDate,
                venue: rp.event.venue,
            },
            pdfBuffer,
        };
    }

    /**
     * Obtener boletos generados por un RP
     */
    async getRPTickets(rpCode: string) {
        const rp = await this.prisma.rP.findUnique({
            where: { code: rpCode },
        });

        if (!rp) {
            throw new NotFoundException('Código de RP inválido');
        }

        const tickets = await this.prisma.ticket.findMany({
            where: { rpId: rp.id },
            include: {
                order: {
                    include: {
                        buyer: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return {
            rp: {
                name: rp.name,
                code: rp.code,
                ticketsGenerated: rp.ticketsGenerated,
                ticketsUsed: rp.ticketsUsed,
            },
            tickets: tickets.map((t) => ({
                id: t.id,
                status: t.status,
                guestName: t.order.buyer.name,
                guestEmail: t.order.buyer.email,
                usedAt: t.usedAt,
                createdAt: t.createdAt,
            })),
        };
    }

    /**
     * Generar código único para el ticket
     */
    private generateTicketCode(
        orderId: string,
        templateId: string,
        rpCode: string,
    ): string {
        const prefix = 'MM';
        const orderSegment = orderId
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, 6)
            .toUpperCase();
        const rpSegment = rpCode.replace('RP-', '').slice(0, 6).toUpperCase();
        const randomSegment = Math.random().toString(36).slice(2, 8).toUpperCase();
        return `${prefix}-${rpSegment}-${orderSegment}-${Date.now()
            .toString(36)
            .toUpperCase()}${randomSegment}`;
    }
}
