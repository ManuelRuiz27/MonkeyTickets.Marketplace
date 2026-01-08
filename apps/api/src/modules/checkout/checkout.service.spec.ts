import { BadRequestException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import type { Buyer, Event, Order, Ticket, TicketTemplate } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '../prisma/prisma.service';
import { LegalService } from '../../legal/legal.service';
import { EmailService } from '../email/email.service';
import { PaymentService } from './payment.service';
import { ReservationService } from './reservation.service';

const MOCK_EVENT_ID = 'event-1';
const MOCK_BUYER: Buyer = {
    id: 'buyer-1',
    email: 'buyer@test.com',
    name: 'Test Buyer',
    phone: '5555555555',
} as Buyer;

describe('CheckoutService', () => {
    let prisma: DeepMockProxy<PrismaService>;
    let legalService: Pick<LegalService, 'logOrderContext'>;
    let reservationService: ReservationService;
    let emailService: Pick<EmailService, 'sendTicketsEmail' | 'sendPendingPaymentEmail'>;
    let paymentService: Pick<PaymentService, 'createPreference'>;
    let service: CheckoutService;

    beforeEach(() => {
        prisma = mockDeep<PrismaService>();
        legalService = {
            logOrderContext: jest.fn(),
        };
        reservationService = {
            checkAvailability: jest.fn().mockResolvedValue(true),
            reserveTickets: jest.fn().mockResolvedValue(true),
            releaseReservation: jest.fn().mockResolvedValue(undefined),
        } as unknown as ReservationService;
        emailService = {
            sendTicketsEmail: jest.fn().mockResolvedValue(undefined),
            sendPendingPaymentEmail: jest.fn().mockResolvedValue(undefined),
        };
        paymentService = {
            createPreference: jest.fn().mockResolvedValue({
                preferenceId: 'pref-123',
                initPoint: 'https://sandbox.mercadopago.com.mx/checkout/v1/redirect?pref_id=...',
                sandboxInitPoint: 'https://sandbox.mercadopago.com.mx/checkout/v1/redirect?pref_id=...',
            }),
        };
        prisma.$transaction.mockImplementation(async (callback) => callback(prisma as unknown as PrismaClient));
        service = new CheckoutService(
            prisma,
            legalService as LegalService,
            reservationService,
            emailService as EmailService,
            paymentService as PaymentService
        );
    });

    it('creates a checkout session computing totals', async () => {
        const now = new Date('2024-01-01T00:00:00Z');
        jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

        prisma.event.findUnique.mockResolvedValue({
            id: MOCK_EVENT_ID,
            status: 'PUBLISHED',
            endDate: null,
            organizerId: 'organizer-1',
            organizer: {
                feePlan: {
                    platformFeePercent: new Prisma.Decimal(10),
                    platformFeeFixed: new Prisma.Decimal(5),
                    paymentGatewayFeePercent: new Prisma.Decimal(3.5),
                },
            },
        } as unknown as Event);

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
        ] as unknown as TicketTemplate[];

        prisma.ticketTemplate.findMany
            .mockResolvedValueOnce(templates)
            .mockResolvedValueOnce(templates);

        prisma.buyer.findFirst.mockResolvedValue(null);
        prisma.buyer.create.mockResolvedValue(MOCK_BUYER);
        prisma.order.create.mockResolvedValue({
            id: 'order-123',
            total: new Prisma.Decimal(250),
            currency: 'MXN',
        } as unknown as Order);
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
            reservedUntil: expect.any(String),
            preferenceId: 'pref-123',
            initPoint: expect.any(String),
        });
        expect(prisma.order.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    total: 250,
                    currency: 'MXN',
                    platformFeeAmount: 30,
                    organizerIncomeAmount: 211.25,
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
        } as unknown as Event);

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

    it('returns summary for pending orders', async () => {
        prisma.order.findUnique.mockResolvedValue({
            id: 'order-1',
            status: 'PENDING',
            total: new Prisma.Decimal(180),
            currency: 'MXN',
            buyer: {
                name: 'Buyer',
                email: 'buyer@test.com',
                phone: '5512345678',
            },
        } as unknown as Order);

        const summary = await service.getCheckoutOrderSummary('order-1');

        expect(summary).toEqual({
            orderId: 'order-1',
            total: 180,
            currency: 'MXN',
            buyer: {
                name: 'Buyer',
                email: 'buyer@test.com',
                phone: '5512345678',
            },
        });
        expect(prisma.order.findUnique).toHaveBeenCalledWith({
            where: { id: 'order-1' },
            include: { buyer: true },
        });
    });

    it('completes manual order and generates tickets', async () => {
        prisma.order.findUnique.mockResolvedValue({
            id: 'order-1',
            status: 'PENDING',
            items: [{ templateId: 'template-1', quantity: 2 }],
            tickets: [],
        } as unknown as Order);
        prisma.ticketTemplate.findMany.mockResolvedValue([
            { id: 'template-1', quantity: 10, sold: 1, name: 'General' },
        ] as unknown as TicketTemplate[]);
        prisma.ticketTemplate.update.mockResolvedValue({} as TicketTemplate);
        prisma.ticket.create
            .mockResolvedValueOnce({ id: 'ticket-1' } as Ticket)
            .mockResolvedValueOnce({ id: 'ticket-2' } as Ticket);
        prisma.order.update.mockResolvedValue({ id: 'order-1' } as unknown as Order);

        const result = await service.completeManualOrder('order-1');

        expect(result.tickets).toHaveLength(2);
        expect(prisma.ticketTemplate.update).toHaveBeenCalledWith({
            where: { id: 'template-1' },
            data: { sold: { increment: 2 } },
        });
        expect(prisma.ticket.create).toHaveBeenCalledTimes(2);
        expect(prisma.order.update).toHaveBeenCalledWith({
            where: { id: 'order-1' },
            data: expect.objectContaining({ status: 'PAID' }),
        });
        expect(reservationService.releaseReservation).toHaveBeenCalledWith('order-1');
        expect(emailService.sendTicketsEmail).toHaveBeenCalledWith('order-1');
    });

    it('returns existing tickets when order already paid', async () => {
        prisma.order.findUnique.mockResolvedValue({
            id: 'order-2',
            status: 'PAID',
            items: [],
            tickets: [{ id: 'ticket-existing' }],
        } as unknown as Order);

        const result = await service.completeManualOrder('order-2');

        expect(result).toEqual({
            orderId: 'order-2',
            tickets: [{ id: 'ticket-existing' }],
        });
        expect(prisma.ticketTemplate.findMany).not.toHaveBeenCalled();
        expect(emailService.sendTicketsEmail).not.toHaveBeenCalled();
    });
});
