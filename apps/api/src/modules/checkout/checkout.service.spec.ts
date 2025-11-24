import { BadRequestException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '../prisma/prisma.service';
import { LegalService } from '../../legal/legal.service';

const MOCK_EVENT_ID = 'event-1';
const MOCK_BUYER = { id: 'buyer-1', email: 'buyer@test.com', name: 'Test Buyer', phone: '5555555555' };

describe('CheckoutService', () => {
    let prisma: DeepMockProxy<PrismaService>;
    let legalService: Pick<LegalService, 'logOrderContext'>;
    let service: CheckoutService;

    beforeEach(() => {
        prisma = mockDeep<PrismaService>();
        legalService = {
            logOrderContext: jest.fn(),
        };
        prisma.$transaction.mockImplementation(async (callback) => callback(prisma as unknown as PrismaClient));
        service = new CheckoutService(prisma, legalService as LegalService);
    });

    it('creates a checkout session computing totals', async () => {
        const now = new Date('2024-01-01T00:00:00Z');
        jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

        prisma.event.findUnique.mockResolvedValue({
            id: MOCK_EVENT_ID,
            status: 'PUBLISHED',
            endDate: null,
        } as any);

        const templates = [
            {
                id: 'template-1',
                eventId: MOCK_EVENT_ID,
                price: new Prisma.Decimal(100),
                currency: 'MXN',
                quantity: 50,
            },
            {
                id: 'template-2',
                eventId: MOCK_EVENT_ID,
                price: new Prisma.Decimal(50),
                currency: 'MXN',
                quantity: 10,
            },
        ];

        prisma.ticketTemplate.findMany
            .mockResolvedValueOnce(templates as any)
            .mockResolvedValueOnce(templates as any);

        prisma.buyer.findFirst.mockResolvedValue(null);
        prisma.buyer.create.mockResolvedValue(MOCK_BUYER as any);
        prisma.order.create.mockResolvedValue({
            id: 'order-123',
            total: new Prisma.Decimal(250),
            currency: 'MXN',
        } as any);
        prisma.payment.create.mockResolvedValue({ id: 'payment-1' } as any);

        const response = await service.createCheckoutSession(
            {
                eventId: MOCK_EVENT_ID,
                tickets: [
                    { templateId: 'template-1', quantity: 1 },
                    { templateId: 'template-2', quantity: 3 },
                ],
                name: 'John Doe',
                email: 'john@example.com',
                phone: '5512345678',
            },
            {
                ip: '127.0.0.1',
                userAgent: 'vitest',
                termsVersion: 'v1',
            },
        );

        expect(response).toEqual({
            orderId: 'order-123',
            total: 250,
            currency: 'MXN',
            expiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        });
        expect(prisma.order.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    total: 250,
                    currency: 'MXN',
                }),
            }),
        );
        expect(legalService.logOrderContext).toHaveBeenCalledWith(
            'order-123',
            'buyer-1',
            '127.0.0.1',
            'vitest',
            'v1',
        );
    });

    it('throws when event is not published', async () => {
        prisma.event.findUnique.mockResolvedValue({
            id: MOCK_EVENT_ID,
            status: 'DRAFT',
        } as any);

        await expect(
            service.createCheckoutSession({
                eventId: MOCK_EVENT_ID,
                tickets: [{ templateId: 'template-1', quantity: 1 }],
                name: 'John',
                email: 'john@example.com',
                phone: '5512345678',
            }),
        ).rejects.toThrow(BadRequestException);
    });
});
