import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizerStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';
import { PaginationQueryDto } from './dto/pagination.dto';
import { DirectorOrganizerStatus } from './dto/update-organizer-status.dto';
import { UpdateOrganizerFeePlanDto } from './dto/update-organizer-fee-plan.dto';

@Injectable()
export class DirectorOrganizersService {
    constructor(private readonly prisma: PrismaService) { }

    async listOrganizers(query: PaginationQueryDto) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const skip = (page - 1) * pageSize;

        const [total, organizers] = await Promise.all([
            this.prisma.organizer.count(),
            this.prisma.organizer.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
                include: {
                    feePlan: true,
                    user: true,
                    _count: {
                        select: { events: true },
                    },
                },
            }),
        ]);

        return {
            data: organizers,
            meta: {
                page,
                pageSize,
                total,
            },
        };
    }

    async getOrganizerDetails(id: string) {
        const organizer = await this.prisma.organizer.findUnique({
            where: { id },
            include: {
                feePlan: true,
                user: true,
                events: {
                    orderBy: { startDate: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        startDate: true,
                        endDate: true,
                        orders: {
                            where: { status: OrderStatus.PAID },
                            select: {
                                total: true,
                                items: {
                                    select: { quantity: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!organizer) {
            throw new NotFoundException('Organizer not found');
        }

        const { events: organizerEvents, ...organizerData } = organizer;

        let totalRevenue = 0;
        let totalTickets = 0;

        const events = organizerEvents.map((event) => {
            const revenue = event.orders.reduce((sum, order) => sum + Number(order.total), 0);
            const ticketsSold = event.orders.reduce((sum, order) => {
                return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
            }, 0);

            totalRevenue += revenue;
            totalTickets += ticketsSold;

            return {
                id: event.id,
                title: event.title,
                status: event.status,
                startDate: event.startDate,
                endDate: event.endDate,
                revenue,
                ticketsSold,
            };
        });

        return {
            ...organizerData,
            sales: {
                totalRevenue,
                totalTickets,
            },
            events,
        };
    }

    async updateStatus(id: string, status: DirectorOrganizerStatus) {
        return this.prisma.organizer.update({
            where: { id },
            data: {
                status: status as OrganizerStatus,
            },
        });
    }

    async updateFeePlan(id: string, dto: UpdateOrganizerFeePlanDto) {
        if (dto.feePlanId) {
            const feePlanExists = await this.prisma.feePlan.findUnique({
                where: { id: dto.feePlanId },
                select: { id: true },
            });

            if (!feePlanExists) {
                throw new NotFoundException('Fee plan not found');
            }
        }

        return this.prisma.organizer.update({
            where: { id },
            data: {
                feePlanId: dto.feePlanId ?? null,
            },
            include: {
                feePlan: true,
            },
        });
    }
}
