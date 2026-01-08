import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { Order, TicketTemplate, Buyer } from '@prisma/client';

export interface PaymentDetails {
    id: string;
    status: string;
    statusDetail?: string;
    externalReference?: string;
    amount?: number;
    currency?: string;
}

export interface PaymentOrderItem {
    templateId: string;
    quantity: number;
    unitPrice: number;
    currency?: string | null;
}

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly accessToken?: string;
    private readonly client: MercadoPagoConfig;
    private readonly preference: Preference;

    constructor() {
        this.accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (!this.accessToken) {
            this.logger.warn('MERCADO_PAGO_ACCESS_TOKEN not set. Payment features will fail.');
        }

        this.client = new MercadoPagoConfig({
            accessToken: this.accessToken || 'TEST-ACCESS-TOKEN',
            options: { timeout: 5000 }
        });

        this.preference = new Preference(this.client);
    }

    async createPreference(
        order: Order & { buyer: Buyer, items: PaymentOrderItem[] },
        itemsDetails: TicketTemplate[]
    ) {
        const backUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const backQuery = `orderId=${order.id}&source=mp`;
        const notificationUrl = process.env.API_URL
            ? `${process.env.API_URL}/api/checkout/webhook`
            : 'https://your-ngrok-url.ngrok-free.app/api/checkout/webhook';

        const preferenceData = {
            body: {
                items: order.items.map(item => {
                    const template = itemsDetails.find(t => t.id === item.templateId);
                    return {
                        id: item.templateId,
                        title: template?.name || 'Ticket',
                        quantity: item.quantity,
                        unit_price: Number(item.unitPrice),
                        currency_id: item.currency || 'MXN',
                    };
                }),
                payer: {
                    email: order.buyer.email,
                    name: order.buyer.name,
                    phone: {
                        number: order.buyer.phone || undefined
                    }
                },
                back_urls: {
                    success: `${backUrl}/checkout/success?${backQuery}`,
                    failure: `${backUrl}/checkout/failure?${backQuery}`,
                    pending: `${backUrl}/checkout/pending?${backQuery}`,
                },
                auto_return: 'approved',
                external_reference: order.id,
                notification_url: notificationUrl,
                statement_descriptor: 'MONOMARKET',
                payment_methods: {
                    excluded_payment_methods: [],
                    excluded_payment_types: [], // Permitir pagos en efectivo (OXXO, etc)
                    installments: 1
                }
            }
        };

        try {
            const preference = await this.preference.create(preferenceData);
            this.logger.log(`Preference created for order ${order.id}: ${preference.id}`);
            return {
                preferenceId: preference.id,
                initPoint: preference.init_point,
                sandboxInitPoint: preference.sandbox_init_point
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error creating MP preference: ${message}`);
            throw new Error('Failed to create payment preference');
        }
    }

    async getPaymentDetails(paymentId: string): Promise<PaymentDetails | null> {
        if (!this.accessToken) {
            this.logger.warn('MERCADO_PAGO_ACCESS_TOKEN not set. Cannot fetch payment details.');
            return null;
        }

        try {
            const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
                timeout: 5000,
            });

            const data = response.data || {};
            return {
                id: String(data.id ?? paymentId),
                status: String(data.status ?? 'unknown'),
                statusDetail: data.status_detail ? String(data.status_detail) : undefined,
                externalReference: data.external_reference ? String(data.external_reference) : undefined,
                amount: typeof data.transaction_amount === 'number' ? data.transaction_amount : undefined,
                currency: data.currency_id ? String(data.currency_id) : undefined,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error fetching MP payment ${paymentId}: ${message}`);
            throw new Error('Failed to fetch payment details');
        }
    }
}
