import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface GenerateGuestTicketDto {
    guestTypeId: string;
    guestNickname?: string;
    quantity?: number; // Permite generar múltiples tickets a la vez
}

@Injectable()
export class RPTicketsV2Service {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * RP genera ticket(s) de invitado
     */
    async generateGuestTicket(
        rpUserId: string,
        data: GenerateGuestTicketDto,
    ) {
        const quantity = data.quantity || 1;

        if (quantity < 1 || quantity > 10) {
            throw new BadRequestException(
                'Cantidad debe estar entre 1 y 10 tickets',
            );
        }

        // Obtener RPProfile del usuario autenticado
        const rpProfile = await this.prisma.rPProfile.findFirst({
            where: { userId: rpUserId },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!rpProfile) {
            throw new NotFoundException('No tienes un perfil RP asignado');
        }

        if (!rpProfile.isActive) {
            throw new ForbiddenException(
                'Tu perfil RP está desactivado. Contacta al organizador.',
            );
        }

        // Verificar límite de tickets si existe
        if (rpProfile.maxTickets !== null) {
            const newTotal = rpProfile.ticketsGenerated + quantity;
            if (newTotal > rpProfile.maxTickets) {
                throw new BadRequestException(
                    `Límite alcanzado. Tienes ${rpProfile.ticketsGenerated}/${rpProfile.maxTickets} tickets generados.`,
                );
            }
        }

        // Verificar que el guestType pertenece al evento
        const guestType = await this.prisma.guestType.findFirst({
            where: {
                id: data.guestTypeId,
                eventId: rpProfile.eventId,
            },
        });

        if (!guestType) {
            throw new NotFoundException(
                'Tipo de invitado no encontrado en este evento',
            );
        }

        // Crear orden "virtual" para el RP (sin pago)
        const order = await this.prisma.order.create({
            data: {
                eventId: rpProfile.eventId,
                buyerId: rpProfile.userId,
                status: 'PAID',
                total: 0, // Sin costo para tickets de RP
                currency: 'MXN',
            },
        });

        // Obtener template por defecto del evento
        const defaultTemplate = await this.prisma.ticketTemplate.findFirst({
            where: {
                eventId: rpProfile.eventId,
            },
            orderBy: { createdAt: 'asc' },
        });

        if (!defaultTemplate) {
            throw new NotFoundException(
                'No hay plantillas de ticket disponibles para este evento',
            );
        }

        // Generar tickets
        const tickets = [];
        for (let i = 0; i < quantity; i++) {
            const qrCode = `RP-${uuidv4()}`;

            const ticket = await this.prisma.ticket.create({
                data: {
                    orderId: order.id,
                    templateId: defaultTemplate.id,
                    qrCode,
                    status: 'VALID',
                    rpProfileId: rpProfile.id,
                    guestTypeId: guestType.id,
                    guestNickname: data.guestNickname,
                },
                include: {
                    template: {
                        select: {
                            name: true,
                        },
                    },
                    guestType: {
                        select: {
                            name: true,
                            color: true,
                            icon: true,
                        },
                    },
                },
            });

            tickets.push(ticket);
        }

        // Incrementar contador del RP
        await this.prisma.rPProfile.update({
            where: { id: rpProfile.id },
            data: {
                ticketsGenerated: { increment: quantity },
            },
        });

        return {
            message: `${quantity} ticket(s) generado(s) exitosamente`,
            tickets: tickets.map((t) => ({
                id: t.id,
                qrCode: t.qrCode,
                status: t.status,
                guestType: t.guestType,
                guestNickname: t.guestNickname,
                createdAt: t.createdAt,
            })),
            rpProfile: {
                ticketsGenerated: rpProfile.ticketsGenerated + quantity,
                maxTickets: rpProfile.maxTickets,
            },
        };
    }

    /**
     * RP obtiene sus tickets generados
     */
    async getMyTickets(rpUserId: string, filters?: {
        status?: 'VALID' | 'USED' | 'CANCELLED';
        guestTypeId?: string;
    }) {
        const rpProfile = await this.prisma.rPProfile.findFirst({
            where: { userId: rpUserId },
        });

        if (!rpProfile) {
            throw new NotFoundException('No tienes un perfil RP asignado');
        }

        const tickets = await this.prisma.ticket.findMany({
            where: {
                rpProfileId: rpProfile.id,
                ...(filters?.status && { status: filters.status }),
                ...(filters?.guestTypeId && { guestTypeId: filters.guestTypeId }),
            },
            include: {
                guestType: {
                    select: {
                        name: true,
                        color: true,
                        icon: true,
                    },
                },
                order: {
                    select: {
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return {
            total: tickets.length,
            tickets: tickets.map((t) => ({
                id: t.id,
                qrCode: t.qrCode,
                status: t.status,
                guestType: t.guestType,
                guestNickname: t.guestNickname,
                usedAt: t.usedAt,
                createdAt: t.order.createdAt,
            })),
        };
    }

    /**
     * RP obtiene sus estadísticas
     */
    async getMyStats(rpUserId: string) {
        const rpProfile = await this.prisma.rPProfile.findFirst({
            where: { userId: rpUserId },
            include: {
                event: true, // Include full event
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                tickets: {
                    select: {
                        id: true,
                        status: true,
                        guestTypeId: true,
                        guestType: {
                            select: {
                                name: true,
                                color: true,
                            },
                        },
                    },
                },
            },
        });

        if (!rpProfile) {
            throw new NotFoundException('No tienes un perfil RP asignado');
        }

        // Estadísticas generales
        const totalGenerated = rpProfile.ticketsGenerated;
        const totalUsed = rpProfile.ticketsUsed;
        const totalValid = rpProfile.tickets.filter((t) => t.status === 'VALID').length;
        const conversionRate =
            totalGenerated > 0
                ? Math.round((totalUsed / totalGenerated) * 10000) / 100
                : 0;

        // Breakdown por tipo de invitado
        const byGuestType: Record<string, any> = {};
        rpProfile.tickets.forEach((ticket) => {
            if (!ticket.guestType) return;

            const typeName = ticket.guestType.name;
            if (!byGuestType[typeName]) {
                byGuestType[typeName] = {
                    name: typeName,
                    color: ticket.guestType.color,
                    generated: 0,
                    used: 0,
                    valid: 0,
                };
            }

            byGuestType[typeName].generated++;
            if (ticket.status === 'USED') {
                byGuestType[typeName].used++;
            } else if (ticket.status === 'VALID') {
                byGuestType[typeName].valid++;
            }
        });

        return {
            rpProfile: {
                id: rpProfile.id,
                isActive: rpProfile.isActive,
                maxTickets: rpProfile.maxTickets,
                ticketsGenerated: totalGenerated,
                ticketsUsed: totalUsed,
                conversionRate,
            },
            event: rpProfile.event,
            stats: {
                totalGenerated,
                totalUsed,
                totalValid,
                conversionRate,
            },
            byGuestType: Object.values(byGuestType),
        };
    }

    /**
     * RP obtiene tipos de invitado disponibles para su evento
     */
    async getAvailableGuestTypes(rpUserId: string) {
        const rpProfile = await this.prisma.rPProfile.findFirst({
            where: { userId: rpUserId },
            select: {
                eventId: true,
            },
        });

        if (!rpProfile) {
            throw new NotFoundException('No tienes un perfil RP asignado');
        }

        const guestTypes = await this.prisma.guestType.findMany({
            where: {
                eventId: rpProfile.eventId,
            },
            orderBy: {
                displayOrder: 'asc',
            },
        });

        return guestTypes;
    }
}
