import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateGuestTypeDto {
    eventId: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    displayOrder?: number;
    showNicknameOnPdf?: boolean;
}

export interface UpdateGuestTypeDto {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    displayOrder?: number;
    showNicknameOnPdf?: boolean;
}

@Injectable()
export class GuestTypesService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Admin crea tipo de invitado
     */
    async createGuestType(organizerId: string, data: CreateGuestTypeDto) {
        // Verificar que el evento pertenece al organizador
        const event = await this.prisma.event.findFirst({
            where: {
                id: data.eventId,
                organizerId,
            },
        });

        if (!event) {
            throw new NotFoundException('Evento no encontrado');
        }

        // Verificar que no exista un tipo con el mismo nombre en el evento
        const existing = await this.prisma.guestType.findFirst({
            where: {
                eventId: data.eventId,
                name: data.name,
            },
        });

        if (existing) {
            throw new ConflictException(
                'Ya existe un tipo de invitado con ese nombre en este evento',
            );
        }

        // Si no se especifica displayOrder, usar el siguiente disponible
        let displayOrder = data.displayOrder;
        if (displayOrder === undefined) {
            const lastType = await this.prisma.guestType.findFirst({
                where: { eventId: data.eventId },
                orderBy: { displayOrder: 'desc' },
            });
            displayOrder = lastType ? lastType.displayOrder + 1 : 0;
        }

        // Crear tipo de invitado
        const guestType = await this.prisma.guestType.create({
            data: {
                eventId: data.eventId,
                name: data.name,
                description: data.description,
                color: data.color,
                icon: data.icon,
                displayOrder,
                showNicknameOnPdf: data.showNicknameOnPdf ?? false,
            },
        });

        return guestType;
    }

    /**
     * Admin lista tipos de invitado del evento
     */
    async listGuestTypes(eventId: string, organizerId: string) {
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

        const guestTypes = await this.prisma.guestType.findMany({
            where: { eventId },
            orderBy: { displayOrder: 'asc' },
            include: {
                _count: {
                    select: {
                        tickets: true,
                    },
                },
            },
        });

        return guestTypes.map((type) => ({
            id: type.id,
            name: type.name,
            description: type.description,
            color: type.color,
            icon: type.icon,
            displayOrder: type.displayOrder,
            showNicknameOnPdf: type.showNicknameOnPdf,
            ticketCount: type._count.tickets,
            createdAt: type.createdAt,
        }));
    }

    /**
     * Admin obtiene tipo específico
     */
    async getGuestType(guestTypeId: string, organizerId: string) {
        const guestType = await this.prisma.guestType.findUnique({
            where: { id: guestTypeId },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        organizerId: true,
                    },
                },
                _count: {
                    select: {
                        tickets: true,
                    },
                },
            },
        });

        if (!guestType) {
            throw new NotFoundException('Tipo de invitado no encontrado');
        }

        // Verificar ownership
        if (guestType.event.organizerId !== organizerId) {
            throw new ForbiddenException('No tienes acceso a este tipo de invitado');
        }

        return {
            id: guestType.id,
            name: guestType.name,
            description: guestType.description,
            color: guestType.color,
            icon: guestType.icon,
            displayOrder: guestType.displayOrder,
            showNicknameOnPdf: guestType.showNicknameOnPdf,
            ticketCount: guestType._count.tickets,
            event: {
                id: guestType.event.id,
                title: guestType.event.title,
            },
            createdAt: guestType.createdAt,
        };
    }

    /**
     * Admin actualiza tipo de invitado
     */
    async updateGuestType(
        guestTypeId: string,
        organizerId: string,
        data: UpdateGuestTypeDto,
    ) {
        // Verificar ownership
        const guestType = await this.getGuestType(guestTypeId, organizerId);

        // Si se cambia el nombre, verificar que no exista otro con ese nombre
        if (data.name && data.name !== guestType.name) {
            const existing = await this.prisma.guestType.findFirst({
                where: {
                    eventId: guestType.event.id,
                    name: data.name,
                    id: { not: guestTypeId },
                },
            });

            if (existing) {
                throw new ConflictException(
                    'Ya existe otro tipo de invitado con ese nombre',
                );
            }
        }

        // Actualizar
        const updated = await this.prisma.guestType.update({
            where: { id: guestTypeId },
            data: {
                name: data.name,
                description: data.description,
                color: data.color,
                icon: data.icon,
                displayOrder: data.displayOrder,
                showNicknameOnPdf: data.showNicknameOnPdf,
            },
        });

        return updated;
    }

    /**
     * Admin elimina tipo de invitado
     */
    async deleteGuestType(guestTypeId: string, organizerId: string) {
        // Verificar ownership y obtener info
        const guestType = await this.getGuestType(guestTypeId, organizerId);

        // Verificar que no tenga tickets asociados
        if (guestType.ticketCount > 0) {
            throw new ConflictException(
                `No se puede eliminar: hay ${guestType.ticketCount} ticket(s) asociado(s) a este tipo`,
            );
        }

        // Eliminar
        await this.prisma.guestType.delete({
            where: { id: guestTypeId },
        });

        return { message: 'Tipo de invitado eliminado correctamente' };
    }

    /**
     * Admin reordena tipos de invitado
     */
    async reorderGuestTypes(
        eventId: string,
        organizerId: string,
        orderedIds: string[],
    ) {
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

        // Verificar que todos los IDs pertenecen al evento
        const guestTypes = await this.prisma.guestType.findMany({
            where: {
                id: { in: orderedIds },
                eventId,
            },
        });

        if (guestTypes.length !== orderedIds.length) {
            throw new NotFoundException(
                'Algunos tipos de invitado no pertenecen a este evento',
            );
        }

        // Actualizar displayOrder
        const updates = orderedIds.map((id, index) =>
            this.prisma.guestType.update({
                where: { id },
                data: { displayOrder: index },
            }),
        );

        await this.prisma.$transaction(updates);

        return { message: 'Orden actualizado correctamente' };
    }
}
