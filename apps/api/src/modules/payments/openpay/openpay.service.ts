import {
    BadRequestException,
    ConflictException,
    HttpException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { logger } from '@monomarket/config';
import type { components } from '@monomarket/contracts';
import { PaymentsConfigService } from '../../../payments/payments.config';
import { CreateOpenpayChargeDto } from './dto/create-openpay-charge.dto';
import { Openpay, OpenpayClient, forwardedForContext } from './openpay.client';

type OpenpayChargeResponseDto = components['schemas']['OpenpayChargeResponse'];
type OpenpayChargeErrorBody = components['schemas']['OpenpayChargeError'];

interface OpenpayChargePayload {
    method: 'card';
    source_id: string;
    amount: number;
    currency: string;
    description: string;
    order_id: string;
    device_session_id: string;
    customer: {
        name: string;
        last_name: string;
        email: string;
        phone_number: string;
    };
}

interface OpenpayChargeResponse {
    id: string;
    authorization?: string;
    status: string;
    amount: number;
    currency: string;
    order_id: string;
    operation_date: string;
}

interface OpenpayError extends Error {
    http_code?: number;
    error_code?: number | string;
    description?: string;
    category?: string;
    request_id?: string;
}

export type OpenpayChargeResult = OpenpayChargeResponseDto;

const VALIDATION_ERROR_CODES = new Set([1000, 1001, 1004, 1005, 1009, 1013, 1014, 1020]);
const CARD_DECLINED_CODES = new Set([3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011]);
const CONFLICT_ERROR_CODES = new Set([2004, 2005, 2006]);

@Injectable()
export class OpenpayService {
    private readonly client: OpenpayClient;

    constructor(
        private readonly config: PaymentsConfigService,
    ) {
        this.client = new Openpay(
            this.config.getOpenpayMerchantId(),
            this.config.getOpenpayPrivateKey(),
            this.config.isOpenpayProduction(),
        );
    }

    async createCharge(dto: CreateOpenpayChargeDto, clientIp: string): Promise<OpenpayChargeResult> {
        const payload = this.toOpenpayPayload(dto);
        const normalizedIp = clientIp || '0.0.0.0';

        try {
            const charge = await this.dispatchCharge(payload, normalizedIp);
            const response = this.toChargeResult(charge, dto);

            logger.info({
                orderId: dto.orderId,
                amount: dto.amount,
                email: dto.customer.email,
            }, 'Cargo Openpay autorizado');

            return response;
        } catch (error) {
            const providerError = error as OpenpayError;
            logger.warn({
                orderId: dto.orderId,
                amount: dto.amount,
                email: dto.customer.email,
                code: providerError?.error_code,
                category: providerError?.category,
                description: providerError?.description,
            }, 'Error al crear cargo en Openpay');
            this.handleOpenpayError(providerError, dto);
            throw providerError;
        }
    }

    private dispatchCharge(payload: OpenpayChargePayload, clientIp: string): Promise<OpenpayChargeResponse> {
        return new Promise((resolve, reject) => {
            forwardedForContext.run(clientIp, () => {
                this.client.charges.create(payload, (error: OpenpayError | null, charge: OpenpayChargeResponse | null) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    if (!charge) {
                        reject(new Error('Respuesta vacia de Openpay'));
                        return;
                    }

                    resolve(charge);
                });
            });
        });
    }

    private toOpenpayPayload(dto: CreateOpenpayChargeDto): OpenpayChargePayload {
        return {
            method: 'card',
            source_id: dto.tokenId,
            amount: dto.amount,
            description: dto.description,
            order_id: dto.orderId,
            currency: dto.currency.toUpperCase(),
            device_session_id: dto.deviceSessionId,
            customer: {
                name: dto.customer.name,
                last_name: dto.customer.last_name,
                email: dto.customer.email,
                phone_number: dto.customer.phone_number,
            },
        };
    }

    private toChargeResult(charge: OpenpayChargeResponse, dto: CreateOpenpayChargeDto): OpenpayChargeResult {
        const normalizedStatus: NonNullable<OpenpayChargeResponseDto['status']> =
            charge.status === 'completed' ? 'completed' : 'in_review';

        return {
            id: charge.id,
            authorization: charge.authorization,
            operation_date: charge.operation_date,
            orderId: charge.order_id || dto.orderId,
            amount: charge.amount,
            currency: (charge.currency || dto.currency).toUpperCase() as OpenpayChargeResponseDto['currency'],
            status: normalizedStatus,
        };
    }

    private handleOpenpayError(error: OpenpayError, dto: CreateOpenpayChargeDto): never {
        const normalizedCode = typeof error.error_code === 'string'
            ? Number(error.error_code)
            : error.error_code;

        const details: NonNullable<OpenpayChargeErrorBody['details']> = {
            orderId: dto.orderId,
            amount: dto.amount,
            email: dto.customer.email,
            openpay: {
                error_code: normalizedCode ?? undefined,
                description: error.description,
                category: error.category,
                request_id: error.request_id,
            },
        };

        if (normalizedCode && CONFLICT_ERROR_CODES.has(normalizedCode)) {
            throw new ConflictException({
                error: 'ORDER_ALREADY_PAID',
                message: error.description || 'El cargo ya fue procesado previamente',
                details,
            });
        }

        if (normalizedCode && VALIDATION_ERROR_CODES.has(normalizedCode)) {
            throw new BadRequestException({
                error: 'PAYMENT_VALIDATION_ERROR',
                message: error.description || 'Los datos enviados a Openpay no son validos',
                details,
            });
        }

        if (normalizedCode && CARD_DECLINED_CODES.has(normalizedCode)) {
            throw new HttpException({
                error: 'CARD_DECLINED',
                message: error.description || 'Tarjeta rechazada por el emisor',
                details,
            }, HttpStatus.PAYMENT_REQUIRED);
        }

        if (error.category === 'request') {
            throw new BadRequestException({
                error: 'PAYMENT_VALIDATION_ERROR',
                message: error.description || 'Solicitud invalida para Openpay',
                details,
            });
        }

        if (error.category === 'gateway') {
            throw new HttpException({
                error: 'CARD_DECLINED',
                message: error.description || 'Openpay rechazo el cargo',
                details,
            }, HttpStatus.PAYMENT_REQUIRED);
        }

        throw new InternalServerErrorException({
            error: 'PAYMENT_PROVIDER_ERROR',
            message: 'Error al procesar el cargo con Openpay',
            details,
        });
    }
}
