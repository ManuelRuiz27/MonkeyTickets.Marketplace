import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventType, Prisma } from '@prisma/client';

export interface CreateRPDto {
    name: string;
    email: string;
    phone?: string;
    maxTickets?: number;
}

export interface UpdateRPDto {
    name?: string;
    email?: string;
    phone?: string;
    maxTickets?: number | null;
    isActive?: boolean;
}

@Injectable()
export class RPService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Verifica que el evento pertenece al organizador y es tipo RP_NIGHTCLUB
     */
    private async verifyEventOwnership(eventId: string, organizerId: string) {
        const event = await this.prisma.event.findFirst({
            where: {
                id: eventId,
                organizerId,
            },
            select: {
                id: true,
                eventType: true,
                organizerId: true,
            },
        });

        if (!event) {
            throw new NotFoundException('Evento no encontrado');
        }

        if (event.eventType !== EventType.RP_NIGHTCLUB) {
            throw new BadRequestException(
                'Solo los eventos tipo Nightclub pueden tener RPs',
            );
        }

        return event;
    }

    /**
     * Genera código único para el RP
     */
    private async generateUniqueCode(name: string): Promise<string> {
        const cleanName = name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remover acentos
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase()
            .substring(0, 6);

        let attempts = 0;
        let code: string;

        do {
            const randomPart = Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();
            code = `RP-${cleanName}-${randomPart}`;

            const existing = await this.prisma.rP.findUnique({
                where: { code },
            });

            if (!existing) {
                return code;
            }

            attempts++;
        } while (attempts < 10);

        throw new BadRequestException(
            'No se pudo generar un código único. Intenta de nuevo.',
        );
    }

    /**
     * Crear un nuevo RP para un evento
     */
    async createRP(
        eventId: string,
        organizerId: string,
        data: CreateRPDto,
    ) {
        // Verificar evento
        await this.verifyEventOwnership(eventId, organizerId);

        // Generar código único
        const code = await this.generateUniqueCode(data.name);

        // Crear RP
        const rp = await this.prisma.rP.create({
            data: {
                eventId,
                name: data.name,
                email: data.email,
                phone: data.phone,
                code,
                maxTickets: data.maxTickets,
            },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        startDate: true,
                    },
                },
            },
        });

        return {
            ...rp,
            shareLink: this.getShareLink(code),
        };
    }

    /**
     * Listar RPs de un evento
     */
    async listRPsByEvent(eventId: string, organizerId: string) {
        // Verificar evento
        await this.verifyEventOwnership(eventId, organizerId);

        const rps = await this.prisma.rP.findMany({
            where: { eventId },
            include: {
                _count: {
                    select: { tickets: true },
                },
            },
            orderBy: { ticketsUsed: 'desc' },
        });

        return rps.map((rp) => ({
            id: rp.id,
            name: rp.name,
            email: rp.email,
            phone: rp.phone,
            code: rp.code,
            isActive: rp.isActive,
            maxTickets: rp.maxTickets,
            ticketsGenerated: rp.ticketsGenerated,
            ticketsUsed: rp.ticketsUsed,
            conversionRate:
                rp.ticketsGenerated > 0
                    ? (rp.ticketsUsed / rp.ticketsGenerated) * 100
                    : 0,
            shareLink: this.getShareLink(rp.code),
            createdAt: rp.createdAt,
        }));
    }

    /**
     * Obtener un RP por ID
     */
    async getRPById(rpId: string, organizerId: string) {
        const rp = await this.prisma.rP.findUnique({
            where: { id: rpId },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        organizerId: true,
                        startDate: true,
                    },
                },
            },
        });

        if (!rp) {
            throw new NotFoundException('RP no encontrado');
        }

        if (rp.event.organizerId !== organizerId) {
            throw new ForbiddenException('No tienes acceso a este RP');
        }

        return {
            ...rp,
            shareLink: this.getShareLink(rp.code),
        };
    }

    /**
     * Actualizar un RP
     */
    async updateRP(
        rpId: string,
        organizerId: string,
        data: UpdateRPDto,
    ) {
        // Verificar que el RP existe y pertenece al organizador
        const existingRP = await this.getRPById(rpId, organizerId);

        const rp = await this.prisma.rP.update({
            where: { id: rpId },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.email && { email: data.email }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.maxTickets !== undefined && { maxTickets: data.maxTickets }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });

        return {
            ...rp,
            shareLink: this.getShareLink(rp.code),
        };
    }

    /**
     * Eliminar un RP
     */
    async deleteRP(rpId: string, organizerId: string) {
        // Verificar que el RP existe y pertenece al organizador
        await this.getRPById(rpId, organizerId);

        await this.prisma.rP.delete({
            where: { id: rpId },
        });

        return { message: 'RP eliminado correctamente' };
    }

    /**
     * Obtener métricas de un RP específico
     */
    async getRPMetrics(rpId: string, organizerId: string) {
        const rp = await this.getRPById(rpId, organizerId);

        const tickets = await this.prisma.ticket.findMany({
            where: { rpId },
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
                id: rp.id,
                name: rp.name,
                code: rp.code,
                ticketsGenerated: rp.ticketsGenerated,
                ticketsUsed: rp.ticketsUsed,
                conversionRate:
                    rp.ticketsGenerated > 0
                        ? (rp.ticketsUsed / rp.ticketsGenerated) * 100
                        : 0,
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
     * Obtener información pública de un RP (sin autenticación)
     */
    async getRPPublicInfo(rpCode: string) {
        const rp = await this.prisma.rP.findUnique({
            where: { code: rpCode },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        startDate: true,
                        endDate: true,
                        venue: true,
                        address: true,
                        city: true,
                        coverImage: true,
                    },
                },
            },
        });

        if (!rp) {
            throw new NotFoundException('Código de RP inválido');
        }

        return {
            rp: {
                name: rp.name,
                code: rp.code,
                isActive: rp.isActive,
                ticketsGenerated: rp.ticketsGenerated,
                maxTickets: rp.maxTickets,
            },
            event: rp.event,
        };
    }

    /**
     * Genera el link compartible para un RP
     */
    private getShareLink(code: string): string {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return `${baseUrl}/rp/${code}`;
    }
}
