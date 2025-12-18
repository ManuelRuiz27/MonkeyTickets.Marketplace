import { Injectable, UnauthorizedException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

export interface CreateRPUserDto {
    name: string;
    email: string;
    password: string;
    eventId: string;
    maxTickets?: number;
}

export interface UpdateRPProfileDto {
    name?: string;
    email?: string;
    maxTickets?: number | null;
    isActive?: boolean;
}

@Injectable()
export class RPManagementService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    /**
     * Admin crea usuario RP
     */
    async createRPUser(organizerId: string, data: CreateRPUserDto) {
        // Verificar que el evento pertenece al organizador
        const event = await this.prisma.event.findFirst({
            where: {
                id: data.eventId,
                organizerId,
            },
        });

        if (!event) {
            throw new NotFoundException('Evento no encontrado o no es tipo Nightclub');
        }

        // Verificar que el email no esté registrado
        const existingUser = await this.prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw new ConflictException('Ya existe un usuario con este email');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Crear User con role RP
        const user = await this.prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: 'RP',
            },
        });

        // Crear RPProfile
        const rpProfile = await this.prisma.rPProfile.create({
            data: {
                userId: user.id,
                eventId: data.eventId,
                maxTickets: data.maxTickets,
            },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            rpProfile: {
                id: rpProfile.id,
                maxTickets: rpProfile.maxTickets,
                ticketsGenerated: rpProfile.ticketsGenerated,
                ticketsUsed: rpProfile.ticketsUsed,
                isActive: rpProfile.isActive,
                event: rpProfile.event,
            },
            credentials: {
                email: data.email,
                password: data.password, // Password original para enviárselo al RP
            },
        };
    }

    /**
     * Admin lista RPs del evento
     */
    async listRPsByEvent(eventId: string, organizerId: string) {
        // Verificar ownership
        const event = await this.prisma.event.findFirst({
            where: {
                id: eventId,
                organizerId,
            },
        });

        if (!event) {
            throw new NotFoundException('Evento no encontrado');
        }

        const rpProfiles = await this.prisma.rPProfile.findMany({
            where: { eventId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                event: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return rpProfiles.map((rp) => ({
            id: rp.id,
            user: rp.user,
            event: rp.event,
            maxTickets: rp.maxTickets,
            ticketsGenerated: rp.ticketsGenerated,
            ticketsUsed: rp.ticketsUsed,
            conversionRate:
                rp.ticketsGenerated > 0
                    ? Math.round((rp.ticketsUsed / rp.ticketsGenerated) * 10000) / 100
                    : 0,
            isActive: rp.isActive,
            createdAt: rp.createdAt,
        }));
    }

    /**
     * Admin obtiene RP específico
     */
    async getRPProfile(rpProfileId: string, organizerId: string) {
        const rpProfile = await this.prisma.rPProfile.findUnique({
            where: { id: rpProfileId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                event: {
                    select: {
                        id: true,
                        title: true,
                        organizerId: true,
                    },
                },
            },
        });

        if (!rpProfile) {
            throw new NotFoundException('RP no encontrado');
        }

        // Verificar que el evento pertenece al organizador
        if (rpProfile.event.organizerId !== organizerId) {
            throw new ForbiddenException('No tienes acceso a este RP');
        }

        return {
            id: rpProfile.id,
            user: rpProfile.user,
            event: rpProfile.event,
            maxTickets: rpProfile.maxTickets,
            ticketsGenerated: rpProfile.ticketsGenerated,
            ticketsUsed: rpProfile.ticketsUsed,
            conversionRate:
                rpProfile.ticketsGenerated > 0
                    ? Math.round((rpProfile.ticketsUsed / rpProfile.ticketsGenerated) * 10000) / 100
                    : 0,
            isActive: rpProfile.isActive,
            createdAt: rpProfile.createdAt,
        };
    }

    /**
     * Admin actualiza RP
     */
    async updateRPProfile(
        rpProfileId: string,
        organizerId: string,
        data: UpdateRPProfileDto,
    ) {
        // Verificar ownership
        const rpProfile = await this.prisma.rPProfile.findUnique({
            where: { id: rpProfileId },
            include: {
                event: {
                    select: { organizerId: true },
                },
                user: true,
            },
        });

        if (!rpProfile) {
            throw new NotFoundException('RP no encontrado');
        }

        if (rpProfile.event.organizerId !== organizerId) {
            throw new ForbiddenException('No tienes acceso a este RP');
        }

        // Actualizar User si hay cambios de nombre o email
        if (data.name || data.email) {
            const updateData: any = {};
            if (data.name) updateData.name = data.name;
            if (data.email) {
                // Verificar que el nuevo email no esté en uso
                const existingUser = await this.prisma.user.findFirst({
                    where: {
                        email: data.email,
                        id: { not: rpProfile.userId },
                    },
                });
                if (existingUser) {
                    throw new ConflictException('El email ya está en uso');
                }
                updateData.email = data.email;
            }

            await this.prisma.user.update({
                where: { id: rpProfile.userId },
                data: updateData,
            });
        }

        // Actualizar RPProfile
        const updateProfileData: any = {};
        if (data.maxTickets !== undefined) updateProfileData.maxTickets = data.maxTickets;
        if (data.isActive !== undefined) updateProfileData.isActive = data.isActive;

        const updated = await this.prisma.rPProfile.update({
            where: { id: rpProfileId },
            data: updateProfileData,
        });

        return { message: 'RP actualizado correctamente', rpProfile: updated };
    }

    /**
     * Admin elimina RP
     */
    async deleteRPUser(rpProfileId: string, organizerId: string) {
        // Verificar ownership
        const rpProfile = await this.prisma.rPProfile.findUnique({
            where: { id: rpProfileId },
            include: {
                event: {
                    select: { organizerId: true },
                },
            },
        });

        if (!rpProfile) {
            throw new NotFoundException('RP no encontrado');
        }

        if (rpProfile.event.organizerId !== organizerId) {
            throw new ForbiddenException('No tienes acceso a este RP');
        }

        // Eliminar en transacción (primero RPProfile, luego User)
        await this.prisma.$transaction([
            this.prisma.rPProfile.delete({
                where: { id: rpProfileId },
            }),
            this.prisma.user.delete({
                where: { id: rpProfile.userId },
            }),
        ]);

        return { message: 'RP eliminado correctamente' };
    }

    /**
     * Admin toggle activo/inactivo
     */
    async toggleRPStatus(rpProfileId: string, organizerId: string) {
        const rpProfile = await this.getRPProfile(rpProfileId, organizerId);

        const updated = await this.prisma.rPProfile.update({
            where: { id: rpProfileId },
            data: {
                isActive: !rpProfile.isActive,
            },
        });

        return {
            message: updated.isActive ? 'RP activado' : 'RP desactivado',
            isActive: updated.isActive,
        };
    }

    /**
     * Admin resetea password de RP
     */
    async resetRPPassword(rpProfileId: string, organizerId: string, newPassword: string) {
        const rpProfile = await this.getRPProfile(rpProfileId, organizerId);

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.prisma.user.update({
            where: { id: rpProfile.user.id },
            data: {
                password: hashedPassword,
            },
        });

        return {
            message: 'Contraseña actualizada',
            credentials: {
                email: rpProfile.user.email,
                password: newPassword,
            },
        };
    }
}
