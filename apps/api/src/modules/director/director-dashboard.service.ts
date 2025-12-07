import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/**
 * Servicio para dashboard del Director (MVP épica 5)
 */
@Injectable()
export class DirectorDashboardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
    ) { }

    /**
     * Obtiene resumen global de la plataforma
     */
    async getGlobalMetrics() {
        const [
            totalOrganizers,
            activeOrganizers,
            pendingOrganizers,
            totalEvents,
            activeEvents,
            totalOrders,
            paidOrders,
            revenueData,
        ] = await Promise.all([
            this.prisma.organizer.count(),
            this.prisma.organizer.count({ where: { status: 'ACTIVE' } }),
            this.prisma.organizer.count({ where: { status: 'PENDING' } }),
            this.prisma.event.count(),
            this.prisma.event.count({
                where: {
                    status: 'PUBLISHED',
                    endDate: { gte: new Date() },
                },
            }),
            this.prisma.order.count(),
            this.prisma.order.count({ where: { status: 'PAID' } }),
            this.prisma.order.aggregate({
                where: { status: 'PAID' },
                _sum: {
                    platformFeeAmount: true,
                    organizerIncomeAmount: true,
                    total: true,
                },
            }),
        ]);

        return {
            organizers: {
                total: totalOrganizers,
                active: activeOrganizers,
                pending: pendingOrganizers,
                suspended: totalOrganizers - activeOrganizers - pendingOrganizers,
            },
            events: {
                total: totalEvents,
                active: activeEvents,
            },
            orders: {
                total: totalOrders,
                paid: paidOrders,
                pendingOrCancelled: totalOrders - paidOrders,
            },
            revenue: {
                platformFees: Number(revenueData._sum.platformFeeAmount || 0),
                organizersIncome: Number(revenueData._sum.organizerIncomeAmount || 0),
                totalProcessed: Number(revenueData._sum.total || 0),
            },
        };
    }

    /**
     * Lista de organizadores con filtros
     */
    async listOrganizers(status?: string, limit = 50) {
        const where = status ? { status: status as any } : {};

        return this.prisma.organizer.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
                feePlan: true,
                _count: {
                    select: {
                        events: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Aprueba un organizador
     */
    async approveOrganizer(organizerId: string) {
        return this.prisma.organizer.update({
            where: { id: organizerId },
            data: { status: 'ACTIVE' },
        });
    }

    /**
     * Suspende un organizador
     */
    async suspendOrganizer(organizerId: string) {
        return this.prisma.organizer.update({
            where: { id: organizerId },
            data: { status: 'SUSPENDED' },
        });
    }

    /**
     * Obtiene detalles de una orden (incluye logs legales)
     */
    async getOrderDetails(orderId: string) {
        return this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: true,
                event: {
                    include: {
                        organizer: {
                            include: {
                                user: true,
                            },
                        },
                    },
                },
                items: {
                    include: {
                        template: true,
                    },
                },
                payment: true,
                tickets: true,
                emailLogs: true,
            },
        });
    }

    /**
     * Reenvía tickets de una orden
     */
    async resendTickets(orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { buyer: true },
        });

        if (!order || order.status !== 'PAID') {
            throw new Error('Orden no encontrada o no pagada');
        }

        await this.emailService.resendTickets(order.id);

        return { success: true, message: 'Tickets reenviados' };
    }

    /**
     * Configura fee plan para un organizador
     */
    async assignFeePlan(organizerId: string, feePlanId: string) {
        return this.prisma.organizer.update({
            where: { id: organizerId },
            data: { feePlanId },
        });
    }
}

