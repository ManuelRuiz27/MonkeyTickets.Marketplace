import { Injectable } from '@nestjs/common';
import { getEnvVar } from '@monomarket/config';

@Injectable()
export class PaymentsConfigService {
    getMercadoPagoAccessToken(): string {
        return getEnvVar('MERCADOPAGO_ACCESS_TOKEN', process.env.MP_ACCESS_TOKEN);
    }

    getMercadoPagoWebhookSecret(): string {
        return getEnvVar('MERCADOPAGO_WEBHOOK_SECRET', process.env.MP_WEBHOOK_SECRET);
    }
}
