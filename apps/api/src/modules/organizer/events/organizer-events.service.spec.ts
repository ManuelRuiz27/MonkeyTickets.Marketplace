import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Event } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizerEventsService } from './organizer-events.service';
import { TemplatesService } from '../../templates/templates.service';

describe('OrganizerEventsService', () => {
    let prisma: DeepMockProxy<PrismaService>;
    let templatesService: TemplatesService;
    let service: OrganizerEventsService;

    beforeEach(() => {
        prisma = mockDeep<PrismaService>();
        templatesService = {
            assignToEvent: jest.fn(),
        } as unknown as TemplatesService;
        service = new OrganizerEventsService(prisma, templatesService);
    });

    it('creates events with defaults', async () => {
        prisma.event.create.mockResolvedValue({ id: 'event-1', title: 'My Event' } as Event);

        const result = await service.create('org-1', {
            name: 'My Event',
            startDate: '2025-01-01T18:00:00.000Z',
            capacity: 100,
            price: 150,
        });

        expect(prisma.event.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    organizerId: 'org-1',
                    title: 'My Event',
                    status: expect.any(String),
                }),
            }),
        );
        expect(result).toEqual({ id: 'event-1', title: 'My Event' });
    });

    it('updates event data when organizer owns the record', async () => {
        prisma.event.findFirst.mockResolvedValue({
            id: 'event-2',
            organizerId: 'org-9',
        } as Event);
        prisma.event.update.mockResolvedValue({
            id: 'event-2',
            title: 'Updated Event',
        } as Event);

        const result = await service.update('org-9', 'event-2', {
            name: 'Updated Event',
            startDate: '2025-02-01T12:00:00.000Z',
            endDate: '2025-02-01T18:00:00.000Z',
            price: 200,
        });

        expect(prisma.event.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'event-2' },
                data: expect.objectContaining({ title: 'Updated Event' }),
            }),
        );
        expect(result).toEqual({ id: 'event-2', title: 'Updated Event' });
    });

    it('throws if organizer tries to update an event they do not own', async () => {
        prisma.event.findFirst.mockResolvedValue(null);

        await expect(
            service.update('org-1', 'event-x', { name: 'Invalid' }),
        ).rejects.toThrow(NotFoundException);
    });

    it('cancels events instead of deleting', async () => {
        prisma.event.findFirst.mockResolvedValue({ id: 'event-10', organizerId: 'org-1' } as Event);
        prisma.event.update.mockResolvedValue({ id: 'event-10', status: 'CANCELLED' } as Event);

        const result = await service.cancel('org-1', 'event-10');

        expect(prisma.event.update).toHaveBeenCalledWith({
            where: { id: 'event-10' },
            data: { status: 'CANCELLED' },
        });
        expect(result.status).toBe('CANCELLED');
    });

    it('assigns templates ensuring ownership', async () => {
        prisma.event.findFirst.mockResolvedValue({ id: 'event-77', organizerId: 'org-5' } as Event);
        (templatesService.assignToEvent as jest.Mock).mockResolvedValue({ id: 'template-1' });

        const result = await service.assignTemplate('org-5', 'event-77', 'template-1');

        expect(templatesService.assignToEvent).toHaveBeenCalledWith('org-5', 'template-1', 'event-77');
        expect(result).toEqual({ id: 'template-1' });
    });

    it('validates end date comes after start date', async () => {
        expect(() =>
            service.create('org-1', {
                name: 'Invalid',
                startDate: '2025-02-01T18:00:00.000Z',
                endDate: '2025-01-01T18:00:00.000Z',
                capacity: 10,
                price: 10,
            }),
        ).toThrow(BadRequestException);
    });
});
