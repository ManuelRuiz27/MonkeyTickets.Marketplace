import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { logger } from '@monomarket/config';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { CaptchaService } from '../../common/services/captcha.service';

@Controller('checkout')
export class CheckoutController {
    constructor(
        private readonly checkoutService: CheckoutService,
        private readonly rateLimit: RateLimitService,
        private readonly captchaService: CaptchaService,
    ) { }

    @Post('session')
    async createSession(
        @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
        @Req() req: Request,
    ) {
        const ip = this.extractIp(req);
        this.ensureRateLimit(ip);
        await this.captchaService.validateCheckoutCaptcha(createCheckoutSessionDto.captchaToken, ip);
        return this.handleSessionCreation(createCheckoutSessionDto, req, ip);
    }

    @Get('orders/:id')
    async getOrderSummary(@Param('id') id: string) {
        return this.checkoutService.getCheckoutOrderSummary(id);
    }

    @Get('orders/:id/tickets')
    async getOrderTickets(@Param('id') id: string) {
        return this.checkoutService.getOrderTickets(id);
    }

    @Post('orders/:id/manual-complete')
    async completeManualOrder(@Param('id') id: string) {
        return this.checkoutService.completeManualOrder(id);
    }

    // Legacy support while frontend finishes migration.
    @Post()
    async createLegacySession(
        @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
        @Req() req: Request,
    ) {
        const ip = this.extractIp(req);
        this.ensureRateLimit(ip);
        await this.captchaService.validateCheckoutCaptcha(createCheckoutSessionDto.captchaToken, ip);
        return this.handleSessionCreation(createCheckoutSessionDto, req, ip);
    }

    private handleSessionCreation(dto: CreateCheckoutSessionDto, req: Request, ip: string) {
        logger.info(
            {
                eventId: dto.eventId,
                tickets: dto.tickets?.map((ticket) => ({
                    templateId: ticket.templateId,
                    quantity: ticket.quantity,
                })),
                email: dto.email,
            },
            'Incoming checkout session request',
        );

        const userAgentHeader = req.headers['user-agent'];
        const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader ?? 'unknown';
        const termsVersion = process.env.TERMS_VERSION ?? 'v1';

        return this.checkoutService.createCheckoutSession(dto, {
            ip,
            userAgent,
            termsVersion,
        });
    }

    private extractIp(req: Request): string {
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string' && forwarded.length > 0) {
            return forwarded.split(',')[0].trim();
        }
        if (Array.isArray(forwarded) && forwarded.length > 0) {
            return forwarded[0];
        }
        return req.ip || req.socket.remoteAddress || 'unknown';
    }

    private ensureRateLimit(ip: string) {
        const key = `checkout-session:${ip}`;
        const allowed = this.rateLimit.consume(key, 10, 60_000);
        if (!allowed) {
            throw new HttpException(
                'Demasiados intentos de checkout. Intenta nuevamente en unos segundos.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
    }

    private getQueryValue(value: string | string[] | undefined) {
        return Array.isArray(value) ? value[0] : value;
    }

    private normalizeWebhookId(value: string | number | undefined | null) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return String(value);
    }

    @Post('webhook')
    async handleWebhook(@Body() body: MercadoPagoWebhookPayload, @Req() req: Request) {
        const query = req.query as Record<string, string | string[] | undefined>;
        const topic =
            this.getQueryValue(query.topic) ||
            this.getQueryValue(query.type) ||
            body?.type ||
            body?.topic;
        const resource = body?.resource;
        const resourceMatch = typeof resource === 'string'
            ? resource.match(/\/(\d+)(?:\?.*)?$/)
            : null;
        const dataId =
            this.normalizeWebhookId(body?.data?.id) ||
            this.getQueryValue(query.id) ||
            resourceMatch?.[1];

        logger.info(`Webhook received: topic=${topic} id=${dataId}`);

        if (topic === 'payment' && dataId) {
            try {
                await this.checkoutService.processPaymentNotification(String(dataId));
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                logger.error(`Error processing webhook: ${message}`);
            }
        }

        return { status: 'OK' };
    }
}

interface MercadoPagoWebhookPayload {
    type?: string;
    topic?: string;
    data?: {
        id?: string | number;
    };
    resource?: string;
}
