import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import type { PreferenceRequest } from 'mercadopago/dist/clients/preference/commonTypes';
import type { PreferenceCreateData } from 'mercadopago/dist/clients/preference/create/types';
import { PaymentGateway, PaymentStatus } from '@prisma/client';
import { PaymentsConfigService } from '../../../payments/payments.config';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '@monomarket/config';

export interface CreatePreferenceParams {
    orderId: string;
    notificationUrl?: string;
}

export interface PreferenceResponse {
    preferenceId: string;
    initPoint: string;
    sandboxInitPoint?: string;
}

@Injectable()
export class MercadoPagoService {
    private readonly preferenceClient: Preference;

    constructor(
        private readonly paymentsConfig: PaymentsConfigService,
        private readonly prisma: PrismaService,
    ) {
        const integratorId = this.paymentsConfig.getMercadoPagoIntegratorId();
        const client = new MercadoPagoConfig({
            accessToken: this.paymentsConfig.getMercadoPagoAccessToken(),
            options: integratorId ? { integratorId } : undefined,
        });

        this.preferenceClient = new Preference(client);
    }

    async createPreference(params: CreatePreferenceParams): Promise<PreferenceResponse> {
        const order = await this.prisma.order.findUnique({
            where: { id: params.orderId },
            include: {
                buyer: true,
                event: true,
                items: {
                    include: {
                        template: true,
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.status !== 'PENDING') {
            throw new BadRequestException('Order is not pending payment');
        }

        if (order.reservedUntil && order.reservedUntil < new Date()) {
            throw new BadRequestException('Order reservation expired');
        }

        const notificationUrl = params.notificationUrl
            ?? `${this.paymentsConfig.getApiBaseUrl()}/webhooks/mercadopago`;

        const frontendBase = this.paymentsConfig.getFrontendBaseUrl();

        const items: PreferenceRequest['items'] = order.items.map((item, index) => ({
            id: item.templateId,
            title: item.template?.name ?? order.event?.title ?? `Ticket ${index + 1}`,
            description: order.event?.title,
            quantity: item.quantity,
            unit_price: Number(item.unitPrice),
            currency_id: item.currency || order.currency,
        }));

        const body: PreferenceRequest = {
            items,
            payer: {
                email: order.buyer.email,
                name: order.buyer.name ?? undefined,
            },
            external_reference: order.id,
            auto_return: 'approved' as const,
            notification_url: notificationUrl,
            back_urls: {
                success: `${frontendBase}/checkout/success?orderId=${order.id}&status=completed`,
                pending: `${frontendBase}/checkout/success?orderId=${order.id}&status=in_review`,
                failure: `${frontendBase}/checkout/success?orderId=${order.id}&status=failed`,
            },
            metadata: {
                orderId: order.id,
                eventId: order.eventId,
                buyerEmail: order.buyer.email,
            },
            statement_descriptor: order.event?.title?.slice(0, 22),
        };

        logger.info(
            {
                orderId: order.id,
                items: items.map((i) => ({ id: i.id, q: i.quantity, price: i.unit_price })),
                notificationUrl,
            },
            'Creating Mercado Pago preference',
        );

        const preference = await this.preferenceClient.create({ body } as PreferenceCreateData);

        await this.prisma.payment.upsert({
            where: { orderId: order.id },
            update: {
                gatewayTransactionId: preference.id ?? undefined,
                status: PaymentStatus.PENDING,
            },
            create: {
                orderId: order.id,
                gateway: PaymentGateway.MERCADOPAGO,
                amount: order.total,
                currency: order.currency,
                status: PaymentStatus.PENDING,
                gatewayTransactionId: preference.id ?? undefined,
            },
        });

        return {
            preferenceId: preference.id ?? '',
            initPoint: preference.init_point ?? '',
            sandboxInitPoint: preference.sandbox_init_point ?? undefined,
        };
    }
}
