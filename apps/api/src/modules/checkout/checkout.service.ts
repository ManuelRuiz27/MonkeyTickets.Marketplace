import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { LegalService } from '../../legal/legal.service';
import { ReservationService } from './reservation.service';

const CHECKOUT_SESSION_TTL_MINUTES = 30;

interface CheckoutSessionContext {
    ip: string;
    userAgent: string;
    termsVersion: string;
}

@Injectable()
export class CheckoutService {
    private readonly logger = new Logger(CheckoutService.name);

    constructor(
        private prisma: PrismaService,
        private legalService: LegalService,
        private reservationService: ReservationService,
    ) { }

    async createCheckoutSession(data: CreateCheckoutSessionDto, context?: CheckoutSessionContext) {
        const event = await this.prisma.event.findUnique({
            where: { id: data.eventId },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (event.status !== 'PUBLISHED') {
            throw new BadRequestException('Event is not available for purchase');
        }

        if (event.endDate && new Date() > event.endDate) {
            throw new BadRequestException('Evento finalizado');
        }

        // Calcular total de tickets solicitados
        const ticketsByTemplate = new Map<string, number>();
        let totalTicketsRequested = 0;
        for (const ticket of data.tickets) {
            const current = ticketsByTemplate.get(ticket.templateId) ?? 0;
            ticketsByTemplate.set(ticket.templateId, current + ticket.quantity);
            totalTicketsRequested += ticket.quantity;
        }

        // MVP: Validar máximo de tickets por compra
        if (totalTicketsRequested > event.maxTicketsPerPurchase) {
            throw new BadRequestException(
                `Máximo ${event.maxTicketsPerPurchase} tickets por compra. Solicitaste ${totalTicketsRequested}.`
            );
        }

        const templateIds = [...ticketsByTemplate.keys()];

        const templates = await this.prisma.ticketTemplate.findMany({
            where: { id: { in: templateIds } },
        });
        const templateMap = new Map(templates.map((template) => [template.id, template]));

        if (templates.length !== templateIds.length) {
            throw new NotFoundException('Una o más plantillas de tickets no encontradas');
        }

        // MVP: Validar disponibilidad considerando reservas activas
        for (const template of templates) {
            const requestedQuantity = ticketsByTemplate.get(template.id) ?? 0;
            const isAvailable = await this.reservationService.checkAvailability(
                event.id,
                template.id,
                template.quantity,
                template.sold,
                requestedQuantity
            );

            if (!isAvailable) {
                throw new BadRequestException(
                    `No hay suficientes tickets disponibles para "${template.name}". Intenta con menos cantidad.`
                );
            }
        }

        let total = 0;
        let currency: string | null = null;

        for (const template of templates) {
            if (template.eventId !== data.eventId) {
                throw new BadRequestException('Plantilla no pertenece a este evento');
            }

            const requestedQuantity = ticketsByTemplate.get(template.id) ?? 0;

            if (currency && template.currency !== currency) {
                throw new BadRequestException('No se pueden mezclar monedas diferentes');
            }

            currency = currency ?? template.currency;
            total += Number(template.price) * requestedQuantity;
        }

        const expiresAt = new Date(Date.now() + CHECKOUT_SESSION_TTL_MINUTES * 60 * 1000);
        const reservedUntil = new Date(Date.now() + 5 * 60 * 1000); // MVP: 5 min lock

        const session = await this.prisma.$transaction(async (tx) => {
            // Double-check availability con locks
            const latestTemplates = await tx.ticketTemplate.findMany({
                where: { id: { in: templateIds } },
                select: { id: true, quantity: true, sold: true },
            });

            for (const template of latestTemplates) {
                const requestedQuantity = ticketsByTemplate.get(template.id) ?? 0;
                const available = await this.reservationService.checkAvailability(
                    event.id,
                    template.id,
                    template.quantity,
                    template.sold,
                    requestedQuantity
                );
                if (!available) {
                    throw new BadRequestException('Tickets agotados durante el proceso');
                }
            }

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

            // MVP: Crear order con IP, User-Agent y reservedUntil
            const order = await tx.order.create({
                data: {
                    eventId: data.eventId,
                    buyerId: buyer.id,
                    status: 'PENDING',
                    total,
                    currency: currency ?? 'MXN',
                    platformFeeAmount: 0,
                    organizerIncomeAmount: 0,
                    ipAddress: context?.ip,
                    userAgent: context?.userAgent,
                    reservedUntil,
                },
            });

            const orderItemsData = templateIds
                .map((templateId) => {
                    const quantity = ticketsByTemplate.get(templateId) ?? 0;
                    if (quantity <= 0) {
                        return null;
                    }

                    const template = templateMap.get(templateId);
                    if (!template) {
                        return null;
                    }

                    return {
                        orderId: order.id,
                        templateId,
                        quantity,
                        unitPrice: template.price,
                        currency: template.currency,
                    };
                })
                .filter((item): item is NonNullable<typeof item> => Boolean(item));

            if (orderItemsData.length > 0) {
                await tx.orderItem.createMany({
                    data: orderItemsData,
                });
            }

            // MVP: Reservar tickets en Redis
            for (const [templateId, quantity] of ticketsByTemplate.entries()) {
                await this.reservationService.reserveTickets(
                    event.id,
                    templateId,
                    quantity,
                    order.id
                );
            }

            this.logger.log(`Checkout creado: ${order.id}, reservado hasta ${reservedUntil.toISOString()}`);

            return {
                response: {
                    orderId: order.id,
                    total: Number(order.total),
                    currency: order.currency,
                    expiresAt: expiresAt.toISOString(),
                    reservedUntil: reservedUntil.toISOString(),
                },
                buyerId: buyer.id,
                orderId: order.id,
            };
        });

        if (context) {
            await this.legalService.logOrderContext(
                session.response.orderId,
                session.buyerId,
                context.ip,
                context.userAgent,
                context.termsVersion,
            );
        }

        return session.response;
    }

    async getCheckoutOrderSummary(orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: true,
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.status !== 'PENDING') {
            throw new BadRequestException('Order is not pending payment');
        }

        return {
            orderId: order.id,
            total: Number(order.total),
            currency: order.currency,
            buyer: {
                name: order.buyer.name ?? undefined,
                email: order.buyer.email,
                phone: order.buyer.phone ?? undefined,
            },
        };
    }
}
