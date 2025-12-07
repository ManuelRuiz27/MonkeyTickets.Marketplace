import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSpeiChargeDto, CreateOxxoChargeDto } from './dto/create-alternative-payment.dto';
import { PaymentGateway, PaymentStatus } from '@prisma/client';

/**
 * Servicio para métodos de pago alternativos de OpenPay (SPEI, OXXO)
 * Complementa el OpenpayService existente que maneja tarjetas
 */
@Injectable()
export class OpenpayAlternativePaymentsService {
    private readonly logger = new Logger(OpenpayAlternativePaymentsService.name);
    private readonly merchantId: string;
    private readonly apiKey: string;
    private readonly apiUrl: string;

    constructor(private prisma: PrismaService) {
        this.merchantId = process.env.OPENPAY_MERCHANT_ID || '';
        this.apiKey = process.env.OPENPAY_API_KEY || '';
        this.apiUrl = process.env.OPENPAY_SANDBOX === 'true'
            ? 'https://sandbox-api.openpay.mx/v1'
            : 'https://api.openpay.mx/v1';
    }

    /**
     * Crea cargo SPEI (transferencia bancaria)
     */
    async createSpeiCharge(dto: CreateSpeiChargeDto) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
            include: { event: true },
        });

        if (!order) {
            throw new BadRequestException('Orden no encontrada');
        }

         if (order.status !== 'PENDING') {
             throw new BadRequestException('La orden no está pendiente de pago');
         }

         const normalizedAmount = Number(order.total);
         if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
             throw new BadRequestException('El total de la orden no es válido para SPEI');
         }

         const currency = order.currency || dto.currency || 'MXN';

        const payload = {
            method: 'bank_account',
            amount: normalizedAmount,
            currency,
            description: dto.description,
            order_id: dto.orderId,
            customer: {
                name: dto.customerName,
                email: dto.customerEmail,
                phone_number: dto.customerPhone || '',
            },
        };

        try {
            const response = await this.makeOpenPayRequest('/charges', 'POST', payload);

            this.logger.log(`Cargo SPEI creado: ${response.id}, CLABE: ${response.payment_method?.clabe}`);

            // Registrar/actualizar Payment para SPEI (OpenPay)
            await this.prisma.payment.upsert({
                where: { orderId: dto.orderId },
                update: {
                    gateway: PaymentGateway.OPENPAY,
                    amount: order.total,
                    currency: currency.toUpperCase(),
                    status: PaymentStatus.PENDING,
                    gatewayTransactionId: response.id,
                    paymentMethod: 'spei',
                },
                create: {
                    orderId: dto.orderId,
                    gateway: PaymentGateway.OPENPAY,
                    amount: order.total,
                    currency: currency.toUpperCase(),
                    status: PaymentStatus.PENDING,
                    gatewayTransactionId: response.id,
                    paymentMethod: 'spei',
                },
            });

            return {
                id: response.id,
                amount: response.amount,
                currency: response.currency,
                status: response.status,
                creationDate: response.creation_date,
                orderId: dto.orderId,
                paymentMethod: {
                    type: 'bank_transfer',
                    bank: response.payment_method?.bank || 'STP',
                    clabe: response.payment_method?.clabe,
                    agreement: response.payment_method?.agreement,
                },
                expiresAt: response.due_date,
            };
        } catch (error: any) {
            this.logger.error(`Error SPEI: ${error.message}`, error.stack);
            throw new BadRequestException(`Error generando CLABE SPEI: ${error.message}`);
        }
    }

    /**
     * Crea cargo OXXO (tienda de conveniencia)
     */
    async createOxxoCharge(dto: CreateOxxoChargeDto) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
            include: { event: true },
        });

        if (!order) {
            throw new BadRequestException('Orden no encontrada');
        }

        if (order.status !== 'PENDING') {
            throw new BadRequestException('La orden no está pendiente de pago');
        }

        const normalizedAmount = Number(order.total);
        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
            throw new BadRequestException('El total de la orden no es válido para OXXO');
        }

        const currency = order.currency || dto.currency || 'MXN';

        // OXXO típicamente vence en 3 días
        const daysToExpire = dto.daysToExpire || 3;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + daysToExpire);

        const payload = {
            method: 'store',
            amount: normalizedAmount,
            currency,
            description: dto.description,
            order_id: dto.orderId,
            due_date: dueDate.toISOString().split('T')[0], // YYYY-MM-DD
            customer: {
                name: dto.customerName,
                email: dto.customerEmail,
            },
        };

        try {
            const response = await this.makeOpenPayRequest('/charges', 'POST', payload);

            this.logger.log(`Cargo OXXO creado: ${response.id}, ref: ${response.payment_method?.reference}`);

            // Registrar/actualizar Payment para OXXO (OpenPay)
            await this.prisma.payment.upsert({
                where: { orderId: dto.orderId },
                update: {
                    gateway: PaymentGateway.OPENPAY,
                    amount: order.total,
                    currency: currency.toUpperCase(),
                    status: PaymentStatus.PENDING,
                    gatewayTransactionId: response.id,
                    paymentMethod: 'oxxo',
                },
                create: {
                    orderId: dto.orderId,
                    gateway: PaymentGateway.OPENPAY,
                    amount: order.total,
                    currency: currency.toUpperCase(),
                    status: PaymentStatus.PENDING,
                    gatewayTransactionId: response.id,
                    paymentMethod: 'oxxo',
                },
            });

            return {
                id: response.id,
                amount: response.amount,
                currency: response.currency,
                status: response.status,
                creationDate: response.creation_date,
                orderId: dto.orderId,
                paymentMethod: {
                    type: 'store',
                    reference: response.payment_method?.reference,
                    barcodeUrl: response.payment_method?.barcode_url,
                },
                expiresAt: response.due_date,
            };
        } catch (error: any) {
            this.logger.error(`Error OXXO: ${error.message}`, error.stack);
            throw new BadRequestException(`Error generando referencia OXXO: ${error.message}`);
        }
    }

    /**
     * Consulta estado de un cargo
     */
    async getCharge(chargeId: string) {
        try {
            return await this.makeOpenPayRequest(`/charges/${chargeId}`, 'GET');
        } catch (error: any) {
            this.logger.error(`Error consultando cargo: ${error.message}`);
            throw new BadRequestException('Error consultando estado del pago');
        }
    }

    /**
     * Realiza petición HTTP a OpenPay API
     */
    private async makeOpenPayRequest(endpoint: string, method: string, data?: any): Promise<any> {
        const url = `${this.apiUrl}/${this.merchantId}${endpoint}`;
        const auth = Buffer.from(`${this.apiKey}:`).toString('base64');

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
            },
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        this.logger.debug(`OpenPay ${method} ${url}`);

        try {
            const response = await fetch(url, options);
            const responseData = await response.json();

            if (!response.ok) {
                const errorMsg = responseData.description || responseData.error_code || 'Error OpenPay';
                throw new Error(errorMsg);
            }

            return responseData;
        } catch (error: any) {
            this.logger.error(`OpenPay API Error: ${error.message}`);
            throw error;
        }
    }
}
