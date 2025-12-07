import { BadRequestException, HttpException, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { PaymentsConfigService } from '../../../payments/payments.config';
import { OpenpayService } from './openpay.service';
import { CreateOpenpayChargeDto } from './dto/create-openpay-charge.dto';

jest.mock('./openpay.client', () => {
    const mockOpenpayCreate = jest.fn();
    const mockForwardRun = jest.fn((_: string, callback: () => any) => callback());

    return {
        Openpay: jest.fn().mockImplementation(() => ({
            charges: {
                create: mockOpenpayCreate,
            },
        })),
        forwardedForContext: {
            run: mockForwardRun,
        },
        __mocks: {
            mockOpenpayCreate,
            mockForwardRun,
        },
    };
});

const { __mocks } = jest.requireMock('./openpay.client') as {
    __mocks: {
        mockOpenpayCreate: jest.Mock;
        mockForwardRun: jest.Mock;
    };
};

const mockOpenpayCreate = __mocks.mockOpenpayCreate;
const mockForwardRun = __mocks.mockForwardRun;

describe('OpenpayService', () => {
    let service: OpenpayService;
    let config: PaymentsConfigService;
    let prisma: any;
    let dto: CreateOpenpayChargeDto;

    beforeEach(() => {
        jest.clearAllMocks();
        mockOpenpayCreate.mockReset();
        mockForwardRun.mockImplementation((_, callback) => callback());

        config = {
            getOpenpayMerchantId: jest.fn().mockReturnValue('merchant-id'),
            getOpenpayPrivateKey: jest.fn().mockReturnValue('private-key'),
            isOpenpayProduction: jest.fn().mockReturnValue(false),
        } as unknown as PaymentsConfigService;

        prisma = {
            order: {
                findUnique: jest.fn().mockResolvedValue({
                    id: 'order-123',
                    status: 'PENDING',
                    reservedUntil: null,
                    total: 150,
                    currency: 'MXN',
                }),
            },
            payment: {
                upsert: jest.fn().mockResolvedValue(null),
            },
        };

        service = new OpenpayService(config, prisma);
        dto = {
            amount: 150,
            currency: 'MXN',
            description: 'Boleto VIP',
            orderId: 'order-123',
            tokenId: 'tok_test',
            deviceSessionId: 'device-session',
            customer: {
                name: 'Ada',
                last_name: 'Lovelace',
                email: 'ada@example.com',
                phone_number: '5512345678',
            },
        };
    });

    it('crea un cargo y devuelve la respuesta normalizada', async () => {
        mockOpenpayCreate.mockImplementation((payload, callback) => {
            callback(null, {
                id: 'chg_1',
                status: 'completed',
                authorization: 'auth_code',
                amount: payload.amount,
                currency: payload.currency,
                order_id: payload.order_id,
                operation_date: '2024-01-01T00:00:00Z',
            });
        });

        const result = await service.createCharge(dto, '187.0.0.1');

        expect(mockForwardRun).toHaveBeenCalledWith('187.0.0.1', expect.any(Function));
        expect(mockOpenpayCreate).toHaveBeenCalledWith(expect.objectContaining({
            source_id: 'tok_test',
            order_id: 'order-123',
            customer: expect.objectContaining({
                email: 'ada@example.com',
            }),
        }), expect.any(Function));
        expect(result).toEqual({
            id: 'chg_1',
            status: 'completed',
            authorization: 'auth_code',
            operation_date: '2024-01-01T00:00:00Z',
            orderId: 'order-123',
            amount: 150,
            currency: 'MXN',
        });
    });

    it.each([
        {
            name: 'errores de validacion',
            openpayError: { error_code: 1001, description: 'Datos invalidos', category: 'request' },
            expectedException: BadRequestException,
            expectedError: 'PAYMENT_VALIDATION_ERROR',
            expectedStatus: HttpStatus.BAD_REQUEST,
        },
        {
            name: 'tarjeta rechazada',
            openpayError: { error_code: 3001, description: 'Tarjeta rechazada', category: 'gateway' },
            expectedException: HttpException,
            expectedError: 'CARD_DECLINED',
            expectedStatus: HttpStatus.PAYMENT_REQUIRED,
        },
        {
            name: 'errores internos',
            openpayError: { error_code: 9000, description: 'Error interno', category: 'internal' },
            expectedException: InternalServerErrorException,
            expectedError: 'PAYMENT_PROVIDER_ERROR',
            expectedStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        },
    ])('mapea %s a la respuesta HTTP correcta', async ({ openpayError, expectedException, expectedError, expectedStatus }) => {
        mockOpenpayCreate.mockImplementation((_, callback) => {
            callback(openpayError, null);
        });

        let caughtError: HttpException | undefined;
        try {
            await service.createCharge(dto, '10.0.0.1');
        } catch (error) {
            caughtError = error as HttpException;
        }

        expect(caughtError).toBeInstanceOf(expectedException);
        expect(caughtError?.getStatus()).toBe(expectedStatus);
        expect(caughtError?.getResponse()).toMatchObject({
            error: expectedError,
            details: expect.objectContaining({
                orderId: dto.orderId,
                amount: dto.amount,
                email: dto.customer.email,
                openpay: expect.objectContaining({
                    error_code: openpayError.error_code,
                }),
            }),
        });
    });
});
