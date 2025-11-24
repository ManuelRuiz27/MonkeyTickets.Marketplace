import { Injectable } from '@nestjs/common';
import { EventStatus, OrganizerStatus, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';
import { DateRangeQueryDto } from './dto/date-range.dto';
import { TopEntitiesQueryDto } from './dto/top-query.dto';

interface DateRange {
    from?: Date;
    to?: Date;
}

@Injectable()
export class DirectorMetricsService {
    constructor(private readonly prisma: PrismaService) { }

    async getOverview(range: DateRangeQueryDto) {
        const dateRange = this.parseRange(range);
        const orderDateFilter = this.buildDateFilter(dateRange);

        const wherePaidOrders: Prisma.OrderWhereInput = {
            status: OrderStatus.PAID,
            ...orderDateFilter,
        };

        const [ordersAggregate, ticketsAggregate, activeEvents, activeOrganizers] = await Promise.all([
            this.prisma.order.aggregate({
                where: wherePaidOrders,
                _sum: {
                    total: true,
                    platformFeeAmount: true,
                },
            }),
            this.prisma.orderItem.aggregate({
                where: {
                    order: wherePaidOrders,
                },
                _sum: {
                    quantity: true,
                },
            }),
            this.prisma.event.count({
                where: {
                    status: EventStatus.PUBLISHED,
                    ...this.buildEventDateFilter(dateRange),
                },
            }),
            this.prisma.organizer.count({
                where: {
                    status: {
                        in: [
                            OrganizerStatus.ACTIVE,
                            OrganizerStatus.APPROVED,
                        ],
                    },
                    ...this.buildOrganizerDateFilter(dateRange),
                },
            }),
        ]);

        return {
            totalGrossSales: this.toNumber(ordersAggregate._sum.total),
            platformRevenue: this.toNumber(ordersAggregate._sum.platformFeeAmount),
            totalTicketsSold: ticketsAggregate._sum.quantity ?? 0,
            activeEvents,
            activeOrganizers,
        };
    }

    async getTopOrganizers(query: TopEntitiesQueryDto) {
        const dateRange = this.parseRange(query);
        const wherePaidOrders: Prisma.OrderWhereInput = {
            status: OrderStatus.PAID,
            ...this.buildDateFilter(dateRange),
        };

        const orders = await this.prisma.order.findMany({
            where: wherePaidOrders,
            select: {
                id: true,
                total: true,
                event: {
                    select: {
                        organizerId: true,
                        organizer: {
                            select: {
                                id: true,
                                businessName: true,
                            },
                        },
                    },
                },
                items: {
                    select: { quantity: true },
                },
            },
        });

        const organizerMap = new Map<string, {
            organizerId: string;
            businessName: string;
            totalRevenue: number;
            ticketsSold: number;
        }>();

        for (const order of orders) {
            if (!order.event?.organizerId) {
                continue;
            }

            const organizerId = order.event.organizerId;
            const current = organizerMap.get(organizerId) ?? {
                organizerId,
                businessName: order.event.organizer?.businessName ?? 'N/A',
                totalRevenue: 0,
                ticketsSold: 0,
            };

            current.totalRevenue += this.toNumber(order.total);
            current.ticketsSold += order.items.reduce((sum, item) => sum + item.quantity, 0);
            organizerMap.set(organizerId, current);
        }

        const limit = query.limit ?? 5;
        return Array.from(organizerMap.values())
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, limit);
    }

    async getTopEvents(query: TopEntitiesQueryDto) {
        const dateRange = this.parseRange(query);
        const wherePaidOrders: Prisma.OrderWhereInput = {
            status: OrderStatus.PAID,
            ...this.buildDateFilter(dateRange),
        };

        const orders = await this.prisma.order.findMany({
            where: wherePaidOrders,
            select: {
                eventId: true,
                total: true,
                event: {
                    select: {
                        id: true,
                        title: true,
                        organizer: {
                            select: {
                                id: true,
                                businessName: true,
                            },
                        },
                    },
                },
                items: {
                    select: { quantity: true },
                },
            },
        });

        const eventMap = new Map<string, {
            eventId: string;
            title: string;
            organizerId: string | null;
            organizerName: string | null;
            totalRevenue: number;
            ticketsSold: number;
        }>();

        for (const order of orders) {
            if (!order.eventId || !order.event) {
                continue;
            }

            const current = eventMap.get(order.eventId) ?? {
                eventId: order.eventId,
                title: order.event.title,
                organizerId: order.event.organizer?.id ?? null,
                organizerName: order.event.organizer?.businessName ?? null,
                totalRevenue: 0,
                ticketsSold: 0,
            };

            current.totalRevenue += this.toNumber(order.total);
            current.ticketsSold += order.items.reduce((sum, item) => sum + item.quantity, 0);
            eventMap.set(order.eventId, current);
        }

        const limit = query.limit ?? 5;
        return Array.from(eventMap.values())
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, limit);
    }

    private toNumber(value?: Prisma.Decimal | null) {
        if (!value) {
            return 0;
        }
        return Number(value);
    }

    private parseRange(range?: DateRangeQueryDto): DateRange {
        const from = range?.from ? new Date(range.from) : undefined;
        const to = range?.to ? new Date(range.to) : undefined;
        return { from: this.normalizeDate(from), to: this.normalizeDate(to) };
    }

    private normalizeDate(date?: Date) {
        if (!date || Number.isNaN(date.getTime())) {
            return undefined;
        }
        return date;
    }

    private buildDateFilter(range: DateRange) {
        if (!range.from && !range.to) {
            return {};
        }

        const createdAt: Prisma.DateTimeFilter = {};
        if (range.from) {
            createdAt.gte = range.from;
        }
        if (range.to) {
            createdAt.lte = range.to;
        }

        return { createdAt };
    }

    private buildEventDateFilter(range: DateRange) {
        if (!range.from && !range.to) {
            return {};
        }

        const startDate: Prisma.DateTimeFilter = {};
        if (range.from) {
            startDate.gte = range.from;
        }
        if (range.to) {
            startDate.lte = range.to;
        }
        return { startDate };
    }

    private buildOrganizerDateFilter(range: DateRange) {
        if (!range.from && !range.to) {
            return {};
        }

        const createdAt: Prisma.DateTimeFilter = {};
        if (range.from) {
            createdAt.gte = range.from;
        }
        if (range.to) {
            createdAt.lte = range.to;
        }

        return { createdAt };
    }
}
