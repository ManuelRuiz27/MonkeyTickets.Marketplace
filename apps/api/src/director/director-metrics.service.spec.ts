import { Prisma } from '@prisma/client';
import type { Order } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../modules/prisma/prisma.service';
import { DirectorMetricsService } from './director-metrics.service';

describe('DirectorMetricsService', () => {
    let prisma: DeepMockProxy<PrismaService>;
    let service: DirectorMetricsService;

    beforeEach(() => {
        prisma = mockDeep<PrismaService>();
        service = new DirectorMetricsService(prisma);
    });

    it('returns overview metrics applying date filters', async () => {
        prisma.order.aggregate.mockResolvedValue({
            _count: null,
            _avg: null,
            _sum: {
                total: new Prisma.Decimal(1500),
                platformFeeAmount: new Prisma.Decimal(150),
            },
            _min: null,
            _max: null,
        } as unknown as Prisma.GetOrderAggregateType<Prisma.OrderAggregateArgs>);
        prisma.orderItem.aggregate.mockResolvedValue({
            _count: null,
            _avg: null,
            _sum: { quantity: 120 },
            _min: null,
            _max: null,
        } as unknown as Prisma.GetOrderItemAggregateType<Prisma.OrderItemAggregateArgs>);
        prisma.event.count.mockResolvedValue(7);
        prisma.organizer.count.mockResolvedValue(4);

        const result = await service.getOverview({
            from: '2024-01-01',
            to: '2024-01-31',
        });

        expect(result).toEqual({
            totalGrossSales: 1500,
            platformRevenue: 150,
            totalTicketsSold: 120,
            activeEvents: 7,
            activeOrganizers: 4,
        });
        expect(prisma.order.aggregate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    status: 'PAID',
                    createdAt: expect.objectContaining({
                        gte: new Date('2024-01-01'),
                        lte: new Date('2024-01-31'),
                    }),
                }),
            }),
        );
    });

    it('returns top organizers sorted by revenue', async () => {
        prisma.order.findMany.mockResolvedValueOnce([
            {
                id: 'o1',
                total: new Prisma.Decimal(500),
                event: {
                    organizerId: 'org-1',
                    organizer: { id: 'org-1', businessName: 'Alpha' },
                },
                items: [{ quantity: 2 }],
            },
            {
                id: 'o2',
                total: new Prisma.Decimal(800),
                event: {
                    organizerId: 'org-2',
                    organizer: { id: 'org-2', businessName: 'Beta' },
                },
                items: [{ quantity: 4 }, { quantity: 1 }],
            },
        ] as unknown as Order[]);

        const result = await service.getTopOrganizers({ limit: 5 });

        expect(result).toEqual([
            { organizerId: 'org-2', businessName: 'Beta', totalRevenue: 800, ticketsSold: 5 },
            { organizerId: 'org-1', businessName: 'Alpha', totalRevenue: 500, ticketsSold: 2 },
        ]);
    });

    it('returns top events sorted by revenue and tickets', async () => {
        prisma.order.findMany.mockResolvedValueOnce([
            {
                eventId: 'event-1',
                total: new Prisma.Decimal(600),
                event: {
                    id: 'event-1',
                    title: 'Concert',
                    organizer: { id: 'org-1', businessName: 'Alpha' },
                },
                items: [{ quantity: 3 }],
            },
            {
                eventId: 'event-2',
                total: new Prisma.Decimal(400),
                event: {
                    id: 'event-2',
                    title: 'Conference',
                    organizer: { id: 'org-2', businessName: 'Beta' },
                },
                items: [{ quantity: 10 }],
            },
        ] as unknown as Order[]);

        const result = await service.getTopEvents({ limit: 3 });

        expect(result).toEqual([
            {
                eventId: 'event-1',
                title: 'Concert',
                organizerId: 'org-1',
                organizerName: 'Alpha',
                totalRevenue: 600,
                ticketsSold: 3,
            },
            {
                eventId: 'event-2',
                title: 'Conference',
                organizerId: 'org-2',
                organizerName: 'Beta',
                totalRevenue: 400,
                ticketsSold: 10,
            },
        ]);
    });
});
