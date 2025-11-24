import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../modules/prisma/prisma.service';
import { PaymentsConfigService } from './payments.config';
describe('PaymentsService', () => {
    let prisma: DeepMockProxy<PrismaService>;
    let config: PaymentsConfigService;
    let service: PaymentsService;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = mockDeep<PrismaService>();
        config = {
            getMercadoPagoAccessToken: jest.fn().mockReturnValue('mp-token'),
            getMercadoPagoWebhookSecret: jest.fn().mockReturnValue('mp-hook'),
        } as unknown as PaymentsConfigService;
        service = new PaymentsService(prisma, config);
    });

    it('processes a Mercado Pago payment and stores transaction metadata', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
        prisma.order.findUnique.mockResolvedValue({
            id: 'order-1',
            status: 'PENDING',
            total: new Prisma.Decimal(200),
            currency: 'MXN',
            payment: null,
            buyer: { id: 'buyer-1', name: 'Buyer', email: 'buyer@test.com', phone: '5512345678' },
            items: [
                {
                    templateId: 'tpl-1',
                    unitPrice: new Prisma.Decimal(200),
                    quantity: 1,
                    template: { name: 'VIP' },
                },
            ],
            event: { id: 'event-1', title: 'Gran show' },
        } as any);
        prisma.payment.upsert.mockResolvedValue({ id: 'payment-1', status: PaymentStatus.PENDING } as any);

        const response = await service.processPayment({
            orderId: 'order-1',
            provider: 'mercadopago',
            method: 'card',
            token: 'tok_visa',
        });

        expect(prisma.payment.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { orderId: 'order-1' },
                update: expect.objectContaining({
                    gatewayTransactionId: expect.stringContaining('mp_card_1700000000000'),
                }),
            }),
        );
        expect(response).toEqual({
            paymentId: 'payment-1',
            providerPaymentId: expect.stringContaining('mp_card_1700000000000'),
            redirectUrl: undefined,
            instructions: undefined,
        });
    });

    it('processes a Mercado Pago SPEI payment and returns instructions', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
        prisma.order.findUnique.mockResolvedValue({
            id: 'order-99',
            status: 'PENDING',
            total: new Prisma.Decimal(500),
            currency: 'MXN',
            payment: null,
            buyer: { id: 'buyer', name: 'Buyer', email: 'buyer@test.com' },
            items: [],
            event: { id: 'event', title: 'Evento' },
        } as any);
        prisma.payment.upsert.mockResolvedValue({ id: 'payment-99', status: PaymentStatus.PENDING } as any);

        const result = await service.processPayment({
            orderId: 'order-99',
            provider: 'mercadopago',
            method: 'spei',
            token: 'token-spei',
        });

        expect(result.redirectUrl).toContain('https://pay.mercadopago.com/mp_spei');
        expect(result.instructions).toContain('SPEI');
    });

    it('throws when order is not found', async () => {
        prisma.order.findUnique.mockResolvedValue(null);

        await expect(
            service.processPayment({
                orderId: 'missing',
                provider: 'mercadopago',
                method: 'card',
                token: 'token',
            }),
        ).rejects.toThrow(NotFoundException);
    });

    it('throws when order is not pending', async () => {
        prisma.order.findUnique.mockResolvedValue({
            id: 'order-1',
            status: 'PAID',
        } as any);

        await expect(
            service.processPayment({
                orderId: 'order-1',
                provider: 'mercadopago',
                method: 'card',
                token: 'token',
            }),
        ).rejects.toThrow(BadRequestException);
    });
});
