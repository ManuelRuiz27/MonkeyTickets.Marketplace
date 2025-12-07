import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class CaptchaService {
    private readonly logger = new Logger(CaptchaService.name);

    constructor(private readonly configService: ConfigService) { }

    /**
     * Valida el captcha de checkout (reCAPTCHA v3/v2 server-side).
     * Se puede desactivar con CHECKOUT_CAPTCHA_DISABLED=true.
     */
    async validateCheckoutCaptcha(token: string | undefined, ip?: string): Promise<void> {
        const disabled = this.configService.get<string>('CHECKOUT_CAPTCHA_DISABLED') === 'true';
        if (disabled) {
            return;
        }

        const secret = this.configService.get<string>('RECAPTCHA_SECRET');
        if (!secret) {
            this.logger.warn('RECAPTCHA_SECRET no está configurado; omitiendo validación de captcha.');
            return;
        }

        if (!token) {
            throw new BadRequestException('Captcha requerido para iniciar el checkout.');
        }

        try {
            const params = new URLSearchParams();
            params.append('secret', secret);
            params.append('response', token);
            if (ip) {
                params.append('remoteip', ip);
            }

            const response = await axios.post(
                'https://www.google.com/recaptcha/api/siteverify',
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            );

            const data = response.data as { success?: boolean; score?: number; 'error-codes'?: string[] };

            if (!data?.success) {
                this.logger.warn(`Validación de captcha falló: ${JSON.stringify(data)}`);
                throw new BadRequestException('Captcha inválido, intenta de nuevo.');
            }
        } catch (error: any) {
            const message = error?.message || 'Error validando captcha';
            this.logger.error(`Error en validación de captcha: ${message}`, error?.stack);
            throw new BadRequestException('No pudimos validar el captcha, intenta nuevamente.');
        }
    }
}

