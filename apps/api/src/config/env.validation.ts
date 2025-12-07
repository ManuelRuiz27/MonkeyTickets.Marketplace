import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvValidationService {
    constructor(private configService: ConfigService) { }

    validateEnvironment(): void {
        const errors: string[] = [];
        const nodeEnv = this.configService.get<string>('NODE_ENV');

        // Validate JWT_SECRET
        const jwtSecret = this.configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
            errors.push('JWT_SECRET is required');
        } else if (jwtSecret.length < 64) {
            errors.push('JWT_SECRET must be at least 64 characters (256 bits)');
        } else if (jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
            errors.push('JWT_SECRET must be changed from default value');
        }

        // Validate DATABASE_URL
        const databaseUrl = this.configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
            errors.push('DATABASE_URL is required');
        } else if (!databaseUrl.startsWith('postgresql://')) {
            errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
        } else {
            try {
                const parsedUrl = new URL(databaseUrl);
                const hostname = parsedUrl.hostname.toLowerCase();
                const localHosts = ['localhost', '127.0.0.1', '::1'];

                if (nodeEnv === 'production' && localHosts.includes(hostname)) {
                    errors.push('DATABASE_URL cannot point to localhost in production');
                }
            } catch {
                errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
            }
        }

        // Validate REDIS_URL
        const redisUrl = this.configService.get<string>('REDIS_URL');
        if (!redisUrl) {
            errors.push('REDIS_URL is required');
        }

        // Validate OpenPay and Mercado Pago credentials in production
        if (nodeEnv === 'production') {
            const openpayMerchantId = this.configService.get<string>('OPENPAY_MERCHANT_ID');
            const openpayApiKey = this.configService.get<string>('OPENPAY_API_KEY');
            const openpayPrivateKey = this.configService.get<string>('OPENPAY_PRIVATE_KEY');
            const openpayWebhookSecret = this.configService.get<string>('OPENPAY_WEBHOOK_SECRET');

            if (!openpayMerchantId || openpayMerchantId === 'your-merchant-id') {
                errors.push('OPENPAY_MERCHANT_ID must be configured in production');
            }

            if (!openpayApiKey || openpayApiKey.startsWith('sk_your')) {
                errors.push('OPENPAY_API_KEY must be configured in production');
            }

            if (!openpayPrivateKey || openpayPrivateKey.startsWith('sk_')) {
                errors.push('OPENPAY_PRIVATE_KEY must be configured in production');
            }

            if (!openpayWebhookSecret) {
                errors.push('OPENPAY_WEBHOOK_SECRET must be configured in production');
            }

            // Ensure sandbox is disabled in production
            const sandbox = this.configService.get<string>('OPENPAY_SANDBOX');
            if (sandbox === 'true') {
                errors.push('OPENPAY_SANDBOX must be set to false in production');
            }

            const mpAccessToken =
                this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN')
                ?? this.configService.get<string>('MP_ACCESS_TOKEN');
            if (!mpAccessToken) {
                errors.push('MERCADOPAGO_ACCESS_TOKEN (or MP_ACCESS_TOKEN) must be configured in production');
            }

            const mpPublicKey =
                this.configService.get<string>('MERCADOPAGO_PUBLIC_KEY')
                ?? this.configService.get<string>('MP_PUBLIC_KEY');
            if (!mpPublicKey) {
                errors.push('MERCADOPAGO_PUBLIC_KEY (or MP_PUBLIC_KEY) must be configured in production');
            }

            const mpWebhookSecret =
                this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET')
                ?? this.configService.get<string>('MP_WEBHOOK_SECRET');
            if (!mpWebhookSecret) {
                errors.push('MERCADOPAGO_WEBHOOK_SECRET (or MP_WEBHOOK_SECRET) must be configured in production');
            }
        }

        // Validate URLs
        const apiUrl = this.configService.get<string>('API_URL');
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');

        if (!apiUrl) {
            errors.push('API_URL is required');
        }

        if (!frontendUrl) {
            errors.push('FRONTEND_URL is required');
        }

        // If there are errors, throw and prevent startup
        if (errors.length > 0) {
            const errorMessage = `
╔════════════════════════════════════════════════════════════╗
║  ENVIRONMENT VALIDATION FAILED                             ║
╠════════════════════════════════════════════════════════════╣
${errors.map(err => `║  ❌ ${err.padEnd(55)}║`).join('\n')}
╚════════════════════════════════════════════════════════════╝
      `;

            console.error(errorMessage);
            throw new Error('Environment validation failed. Please check your .env file.');
        }

        console.log('✅ Environment validation passed');
    }
}
