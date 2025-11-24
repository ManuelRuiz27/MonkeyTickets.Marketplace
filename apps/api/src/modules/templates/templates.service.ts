import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTemplateInput {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    quantity: number;
    eventId?: string | null;
}

@Injectable()
export class TemplatesService {
    constructor(private readonly prisma: PrismaService) { }

    listByOrganizer(organizerId: string) {
        return this.prisma.ticketTemplate.findMany({
            where: { organizerId },
            include: { event: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createForOrganizer(organizerId: string, input: CreateTemplateInput) {
        if (input.quantity <= 0) {
            throw new BadRequestException('Quantity must be greater than zero');
        }

        if (input.eventId) {
            await this.ensureEventOwnership(input.eventId, organizerId);
        }

        return this.prisma.ticketTemplate.create({
            data: {
                organizerId,
                eventId: input.eventId ?? null,
                name: input.name,
                description: input.description,
                price: new Prisma.Decimal(input.price),
                currency: input.currency ?? 'MXN',
                quantity: input.quantity,
            },
        });
    }

    async deleteForOrganizer(organizerId: string, templateId: string) {
        const template = await this.ensureTemplateOwnership(templateId, organizerId);
        await this.prisma.ticketTemplate.delete({
            where: { id: template.id },
        });
        return template;
    }

    async assignToEvent(organizerId: string, templateId: string, eventId: string) {
        await this.ensureTemplateOwnership(templateId, organizerId);
        await this.ensureEventOwnership(eventId, organizerId);

        return this.prisma.ticketTemplate.update({
            where: { id: templateId },
            data: { eventId },
        });
    }

    private async ensureTemplateOwnership(templateId: string, organizerId: string) {
        const template = await this.prisma.ticketTemplate.findUnique({
            where: { id: templateId },
        });

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        if (template.organizerId !== organizerId) {
            throw new ForbiddenException('Template does not belong to this organizer');
        }

        return template;
    }

    private async ensureEventOwnership(eventId: string, organizerId: string) {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: { id: true, organizerId: true },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (event.organizerId !== organizerId) {
            throw new ForbiddenException('Event does not belong to this organizer');
        }

        return event;
    }
}
