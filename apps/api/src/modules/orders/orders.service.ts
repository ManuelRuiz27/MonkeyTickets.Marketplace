import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
    constructor(private readonly prisma: PrismaService) { }

    async listByEvent(organizerId: string, eventId: string): Promise<any[]> {
        await this.ensureEventOwnership(organizerId, eventId);

        return this.prisma.order.findMany({
            where: { eventId },
            include: {
                buyer: true,
                items: {
                    include: { template: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getByIdForOrganizer(orderId: string, organizerId: string): Promise<any> {
        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                event: {
                    organizerId,
                },
            },
            include: {
                buyer: true,
                event: true,
                tickets: true,
                items: {
                    include: { template: true },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }

    private async ensureEventOwnership(organizerId: string, eventId: string) {
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
