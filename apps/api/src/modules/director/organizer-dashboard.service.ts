import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Servicio para métricas y dashboard del organizador (MVP Épica 4)
 */
@Injectable()
export class OrganizerDashboardService {
    constructor(private prisma: PrismaService) { }

    /**
     * Obtiene resumen general del organizador
     */
    async getOrganizerSummary(userId: string) {
        const organizer = await this.prisma.organizer.findUnique({
            where: { userId },
            include: {
                feePlan: true,
            },
        });

        if (!organizer) {
            return null;
        }

        // Estadísticas generales
        const [totalEvents, activeEvents, totalOrders, totalRevenue] = await Promise.all([
            this.prisma.event.count({
                where: { organizerId: organizer.id },
            }),
            this.prisma.event.count({
                where: {
                    organizerId: organizer.id,
                    status: 'PUBLISHED',
                    endDate: { gte: new Date() },
                },
            }),
            this.prisma.order.count({
                where: {
                    event: { organizerId: organizer.id },
                    status: 'PAID',
                },
            }),
            this.prisma.order.aggregate({
                where: {
                    event: { organizerId: organizer.id },
                    status: 'PAID',
                },
                _sum: {
                    organizerIncomeAmount: true,
                },
            }),
        ]);

        // Cortesías disponibles
        const events = await this.prisma.event.findMany({
            where: { organizerId: organizer.id },
            select: { capacity: true },
        });

        const totalAllowedCortesias = events.reduce((sum, event) => {
            return sum + (event.capacity >= 2500 ? 330 : 5);
        }, 0);

        return {
            organizerId: organizer.id,
            businessName: organizer.businessName,
            status: organizer.status,
            feePlan: organizer.feePlan,
            stats: {
                totalEvents,
                activeEvents,
                totalOrders,
                totalRevenue: Number(totalRevenue._sum.organizerIncomeAmount || 0),
            },
            cortesias: {
                used: organizer.complementaryTicketsUsed,
                totalAllowed: totalAllowedCortesias,
                remaining: Math.max(0, totalAllowedCortesias - organizer.complementaryTicketsUsed),
            },
        };
    }

    /**
     * Obtiene métricas de un evento específico
     */
    async getEventMetrics(eventId: string, userId: string) {
        const event = await this.prisma.event.findFirst({
            where: {
                id: eventId,
                organizer: { userId },
            },
            include: {
                templates: true,
                orders: {
                    where: { status: 'PAID' },
                    include: { items: true },
                },
            },
        });

        if (!event) {
            return null;
        }

        // Calcular métricas
        const totalTicketsSold = event.templates.reduce((sum, t) => sum + t.sold, 0);
        const totalRevenue = event.orders.reduce((sum, o) => sum + Number(o.total), 0);
        const totalOrders = event.orders.length;

        // Ventas por template
        const salesByTemplate = event.templates.map(template => ({
            id: template.id,
            name: template.name,
            price: Number(template.price),
            quantity: template.quantity,
            sold: template.sold,
            available: template.quantity - template.sold,
            revenue: Number(template.price) * template.sold,
            isComplimentary: template.isComplimentary,
        }));

        // Asistencia
        const attendanceRate = event.capacity > 0
            ? (event.attendanceCount / event.capacity) * 100
            : 0;

        return {
            event: {
                id: event.id,
                title: event.title,
                startDate: event.startDate,
                status: event.status,
                capacity: event.capacity,
            },
            sales: {
                totalTicketsSold,
                totalRevenue,
                totalOrders,
                averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            },
            attendance: {
                checkedIn: event.attendanceCount,
                capacity: event.capacity,
                rate: attendanceRate,
            },
            templates: salesByTemplate,
        };
    }

    /**
     * Obtiene lista de órdenes de un evento
     */
    async getEventOrders(eventId: string, userId: string, limit = 50) {
        const event = await this.prisma.event.findFirst({
            where: {
                id: eventId,
                organizer: { userId },
            },
        });

        if (!event) {
            return [];
        }

        return this.prisma.order.findMany({
            where: { eventId },
            include: {
                buyer: true,
                items: {
                    include: {
                        template: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
}
