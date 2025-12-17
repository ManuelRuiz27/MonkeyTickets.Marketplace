import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RPDashboardService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Obtener tablero completo de RPs para un evento
     */
    async getEventRPDashboard(eventId: string, organizerId: string) {
        // Verificar que el evento existe y pertenece al organizador
        const event = await this.prisma.event.findFirst({
            where: {
                id: eventId,
                organizerId,
            },
            select: {
                id: true,
                title: true,
                eventType: true,
            },
        });

        if (!event) {
            throw new NotFoundException('Evento no encontrado');
        }

        if (event.eventType !== 'RP_NIGHTCLUB') {
            throw new ForbiddenException('Este evento no es tipo Nightclub');
        }

        // Obtener todos los RPs del evento con sus métricas
        const rps = await this.prisma.rP.findMany({
            where: { eventId },
            orderBy: {
                ticketsUsed: 'desc', // Ordenar por asistencia (mayor a menor)
            },
        });

        const totalTicketsGenerated = rps.reduce((sum, rp) => sum + rp.ticketsGenerated, 0);
        const totalTicketsUsed = rps.reduce((sum, rp) => sum + rp.ticketsUsed, 0);
        const activeRPs = rps.filter((rp) => rp.isActive).length;

        // Calcular tasa de conversión promedio
        const avgConversion =
            totalTicketsGenerated > 0 ? (totalTicketsUsed / totalTicketsGenerated) * 100 : 0;

        return {
            event: {
                id: event.id,
                title: event.title,
            },
            summary: {
                totalRPs: rps.length,
                activeRPs,
                totalTicketsGenerated,
                totalTicketsUsed,
                avgConversion: Math.round(avgConversion * 100) / 100,
                noShowRate:
                    totalTicketsGenerated > 0
                        ? Math.round(((totalTicketsGenerated - totalTicketsUsed) / totalTicketsGenerated) * 10000) / 100
                        : 0,
            },
            rps: rps.map((rp) => ({
                id: rp.id,
                name: rp.name,
                code: rp.code,
                email: rp.email,
                phone: rp.phone,
                isActive: rp.isActive,
                maxTickets: rp.maxTickets,
                ticketsGenerated: rp.ticketsGenerated,
                ticketsUsed: rp.ticketsUsed,
                conversionRate:
                    rp.ticketsGenerated > 0
                        ? Math.round((rp.ticketsUsed / rp.ticketsGenerated) * 10000) / 100
                        : 0,
                ranking: 0, // Se calculará después
                createdAt: rp.createdAt,
            }))
                .map((rp, index) => ({
                    ...rp,
                    ranking: index + 1,
                })),
        };
    }

    /**
     * Exportar reporte de RPs en formato simple (para CSV/PDF)
     */
    async exportRPReport(eventId: string, organizerId: string) {
        const dashboard = await this.getEventRPDashboard(eventId, organizerId);

        return {
            event: dashboard.event,
            summary: dashboard.summary,
            reportDate: new Date().toISOString(),
            rps: dashboard.rps.map((rp) => ({
                posicion: rp.ranking,
                nombre: rp.name,
                codigo: rp.code,
                email: rp.email,
                telefono: rp.phone || 'N/A',
                activo: rp.isActive ? 'Sí' : 'No',
                limite: rp.maxTickets || 'Sin límite',
                generados: rp.ticketsGenerated,
                usados: rp.ticketsUsed,
                conversion: `${rp.conversionRate}%`,
            })),
        };
    }
}
