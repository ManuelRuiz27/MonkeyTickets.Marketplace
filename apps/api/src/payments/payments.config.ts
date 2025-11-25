import { Injectable } from '@nestjs/common';
import { getEnvVar, isProduction } from '@monomarket/config';

@Injectable()
export class PaymentsConfigService {
    // Todas las llaves privadas de gateways (Openpay, Mercado Pago) se cargan únicamente
    // aquí en el backend; nunca se exponen a clientes ni al frontend.
    constructor() {
        if (isProduction()) {
            this.ensureOpenpayVariables();
        }
    }

    getMercadoPagoAccessToken(): string {
        return getEnvVar('MP_ACCESS_TOKEN', process.env.MP_ACCESS_TOKEN ?? process.env.MERCADOPAGO_ACCESS_TOKEN);
    }

    getMercadoPagoPublicKey(): string {
        return getEnvVar('MP_PUBLIC_KEY', process.env.MP_PUBLIC_KEY ?? process.env.MERCADOPAGO_PUBLIC_KEY);
    }

    getMercadoPagoIntegratorId(): string | undefined {
        return process.env.MP_INTEGRATOR_ID;
    }

    getMercadoPagoWebhookSecret(): string {
        return getEnvVar('MERCADOPAGO_WEBHOOK_SECRET', process.env.MP_WEBHOOK_SECRET);
    }

    getOpenpayMerchantId(): string {
        return getEnvVar('OPENPAY_MERCHANT_ID', process.env.OPENPAY_MERCHANT_ID);
    }

    getOpenpayPrivateKey(): string {
        return getEnvVar('OPENPAY_PRIVATE_KEY', process.env.OPENPAY_PRIVATE_KEY);
    }

    getOpenpayPublicKey(): string {
        return getEnvVar('OPENPAY_PUBLIC_KEY', process.env.OPENPAY_PUBLIC_KEY);
    }

    isOpenpayProduction(): boolean {
        const rawValue = process.env.OPENPAY_PRODUCTION ?? 'false';
        return rawValue.toLowerCase() === 'true' || rawValue === '1';
    }

    private ensureOpenpayVariables(): void {
        [
            'OPENPAY_MERCHANT_ID',
            'OPENPAY_PRIVATE_KEY',
            'OPENPAY_PUBLIC_KEY',
        ].forEach((name) => getEnvVar(name, process.env[name]));
    }
}
