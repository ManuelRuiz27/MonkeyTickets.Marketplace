import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { LegalService } from '../../legal/legal.service';

const CHECKOUT_SESSION_TTL_MINUTES = 30;

interface CheckoutSessionContext {
    ip: string;
    userAgent: string;
    termsVersion: string;
}

@Injectable()
export class CheckoutService {
    constructor(
        private prisma: PrismaService,
        private legalService: LegalService,
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
            throw new BadRequestException('Event has ended');
        }

        const ticketsByTemplate = new Map<string, number>();
        for (const ticket of data.tickets) {
            const current = ticketsByTemplate.get(ticket.templateId) ?? 0;
            ticketsByTemplate.set(ticket.templateId, current + ticket.quantity);
        }

        const templateIds = [...ticketsByTemplate.keys()];

        const templates = await this.prisma.ticketTemplate.findMany({
            where: { id: { in: templateIds } },
        });
        const templateMap = new Map(templates.map((template) => [template.id, template]));

        if (templates.length !== templateIds.length) {
            throw new NotFoundException('One or more ticket templates not found');
        }

        let total = 0;
        let currency: string | null = null;

        for (const template of templates) {
            if (template.eventId !== data.eventId) {
                throw new BadRequestException('Template does not belong to this event');
            }

            const requestedQuantity = ticketsByTemplate.get(template.id) ?? 0;
            if (template.quantity < requestedQuantity) {
                throw new BadRequestException('Not enough tickets available');
            }

            if (currency && template.currency !== currency) {
                throw new BadRequestException('Cannot mix templates from different currencies');
            }

            currency = currency ?? template.currency;
            total += Number(template.price) * requestedQuantity;
        }

        const expiresAt = new Date(Date.now() + CHECKOUT_SESSION_TTL_MINUTES * 60 * 1000);

        const session = await this.prisma.$transaction(async (tx) => {
            const latestTemplates = await tx.ticketTemplate.findMany({
                where: { id: { in: templateIds } },
                select: { id: true, quantity: true },
            });

            for (const template of latestTemplates) {
                const requestedQuantity = ticketsByTemplate.get(template.id) ?? 0;
                if (template.quantity < requestedQuantity) {
                    throw new BadRequestException('Tickets sold out during processing');
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

            const order = await tx.order.create({
                data: {
                    eventId: data.eventId,
                    buyerId: buyer.id,
                    status: 'PENDING',
                    total,
                    currency: currency ?? 'MXN',
                    platformFeeAmount: 0,
                    organizerIncomeAmount: 0,
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

            await tx.payment.create({
                data: {
                    orderId: order.id,
                    gateway: 'MERCADOPAGO',
                    amount: total,
                    currency: currency ?? 'MXN',
                    status: 'PENDING',
                },
            });

            return {
                response: {
                    orderId: order.id,
                    total: Number(order.total),
                    currency: order.currency,
                    expiresAt: expiresAt.toISOString(),
                },
                buyerId: buyer.id,
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
}
