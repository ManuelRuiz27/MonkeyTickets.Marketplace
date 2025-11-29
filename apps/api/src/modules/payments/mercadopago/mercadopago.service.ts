import { Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import type { PreferenceRequest } from 'mercadopago/dist/clients/preference/commonTypes';
import type { PreferenceCreateData } from 'mercadopago/dist/clients/preference/create/types';
import { PaymentsConfigService } from '../../../payments/payments.config';
import { logger } from '@monomarket/config';

export interface CreatePreferenceParams {
    orderId: string;
    title: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    currency: 'MXN';
    notificationUrl?: string;
    payer: {
        email: string;
        name?: string;
    };
}

export interface PreferenceResponse {
    preferenceId: string;
    initPoint: string;
    sandboxInitPoint?: string;
}

@Injectable()
export class MercadoPagoService {
    private readonly preferenceClient: Preference;

    constructor(private readonly paymentsConfig: PaymentsConfigService) {
        const integratorId = this.paymentsConfig.getMercadoPagoIntegratorId();
        const client = new MercadoPagoConfig({
            accessToken: this.paymentsConfig.getMercadoPagoAccessToken(),
            options: integratorId ? { integratorId } : undefined,
        });

        this.preferenceClient = new Preference(client);
    }

    async createPreference(params: CreatePreferenceParams): Promise<PreferenceResponse> {
        const body: PreferenceRequest = {
            items: [
                {
                    id: params.orderId,
                    title: params.title,
                    description: params.description,
                    quantity: params.quantity,
                    unit_price: params.unitPrice,
                    currency_id: params.currency,
                },
            ],
            payer: {
                email: params.payer.email,
                name: params.payer.name,
            },
            external_reference: params.orderId,
            auto_return: 'approved' as const,
        };

        if (params.notificationUrl) {
            body.notification_url = params.notificationUrl;
        }

        const accessToken = this.paymentsConfig.getMercadoPagoAccessToken();
        logger.info(`MercadoPagoService using token: ${accessToken ? accessToken.substring(0, 10) + '...' : 'undefined'}`);
        logger.info(`MercadoPagoService creating preference with body: ${JSON.stringify(body, null, 2)}`);

        const preference = await this.preferenceClient.create({ body } as PreferenceCreateData);

        return {
            preferenceId: preference.id ?? '',
            initPoint: preference.init_point ?? '',
            sandboxInitPoint: preference.sandbox_init_point ?? undefined,
        };
    }
}
