import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TemplatesService } from '../../templates/templates.service';
import { CreateOrganizerEventDto } from './dto/create-organizer-event.dto';
import { UpdateOrganizerEventDto } from './dto/update-organizer-event.dto';

@Injectable()
export class OrganizerEventsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly templatesService: TemplatesService,
    ) { }

    list(organizerId: string) {
        return this.prisma.event.findMany({
            where: { organizerId },
            include: {
                templates: true,
                orders: {
                    select: {
                        id: true,
                        status: true,
                        total: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
            orderBy: { startDate: 'asc' },
        });
    }

    create(organizerId: string, dto: CreateOrganizerEventDto) {
        if (dto.endDate && new Date(dto.endDate) < new Date(dto.startDate)) {
            throw new BadRequestException('End date must be after start date');
        }

        return this.prisma.event.create({
            data: {
                organizerId,
                title: dto.name,
                description: dto.description,
                category: dto.category,
                venue: dto.venue,
                address: dto.address,
                city: dto.city,
                coverImage: dto.coverImage,
                startDate: new Date(dto.startDate),
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                capacity: dto.capacity,
                price: new Prisma.Decimal(dto.price),
                currency: dto.currency ?? 'MXN',
                isPublic: dto.isPublic ?? true,
                status: dto.status ?? EventStatus.DRAFT,
            },
        });
    }

    async get(organizerId: string, eventId: string) {
        return this.ensureEventOwnership(organizerId, eventId);
    }

    async update(organizerId: string, eventId: string, dto: UpdateOrganizerEventDto) {
        if (dto.startDate && dto.endDate && new Date(dto.endDate) < new Date(dto.startDate)) {
            throw new BadRequestException('End date must be after start date');
        }

        const data: Prisma.EventUpdateInput = {};

        if (dto.name !== undefined) {
            data.title = dto.name;
        }
        if (dto.description !== undefined) {
            data.description = dto.description;
        }
        if (dto.startDate !== undefined) {
            data.startDate = new Date(dto.startDate);
        }
        if (dto.endDate !== undefined) {
            data.endDate = dto.endDate ? new Date(dto.endDate) : null;
        }
        if (dto.capacity !== undefined) {
            data.capacity = dto.capacity;
        }
        if (dto.price !== undefined) {
            data.price = new Prisma.Decimal(dto.price);
        }
        if (dto.currency !== undefined) {
            data.currency = dto.currency;
        }
        if (dto.isPublic !== undefined) {
            data.isPublic = dto.isPublic;
        }
        if (dto.status !== undefined) {
            data.status = dto.status;
        }
        if (dto.venue !== undefined) {
            data.venue = dto.venue;
        }
        if (dto.address !== undefined) {
            data.address = dto.address;
        }
        if (dto.city !== undefined) {
            data.city = dto.city;
        }
        if (dto.coverImage !== undefined) {
            data.coverImage = dto.coverImage;
        }
        if (dto.category !== undefined) {
            data.category = dto.category;
        }

        await this.ensureEventOwnership(organizerId, eventId);

        return this.prisma.event.update({
            where: { id: eventId },
            data,
        });
    }

    async cancel(organizerId: string, eventId: string) {
        await this.ensureEventOwnership(organizerId, eventId);

        // Instead of deleting the record we mark it as CANCELLED to keep reporting data.
        return this.prisma.event.update({
            where: { id: eventId },
            data: { status: EventStatus.CANCELLED },
        });
    }

    async assignTemplate(organizerId: string, eventId: string, templateId: string) {
        await this.ensureEventOwnership(organizerId, eventId);
        return this.templatesService.assignToEvent(organizerId, templateId, eventId);
    }

    private async ensureEventOwnership(organizerId: string, eventId: string) {
        const event = await this.prisma.event.findFirst({
            where: {
                id: eventId,
                organizerId,
            },
            include: {
                templates: true,
            },
        });

        if (!event) {
            throw new NotFoundException('Event not found for organizer');
        }

        return event;
    }
}
