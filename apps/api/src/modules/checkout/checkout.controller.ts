import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req } from '@nestjs/common';
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
        @Req() req: any,
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

    @Post('orders/:id/manual-complete')
    async completeManualOrder(@Param('id') id: string) {
        return this.checkoutService.completeManualOrder(id);
    }

    // Legacy support while frontend finishes migration.
    @Post()
    async createLegacySession(
        @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
        @Req() req: any,
    ) {
        const ip = this.extractIp(req);
        this.ensureRateLimit(ip);
        await this.captchaService.validateCheckoutCaptcha(createCheckoutSessionDto.captchaToken, ip);
        return this.handleSessionCreation(createCheckoutSessionDto, req, ip);
    }

    private handleSessionCreation(dto: CreateCheckoutSessionDto, req: any, ip: string) {
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

        const userAgent = req.headers['user-agent'] ?? 'unknown';
        const termsVersion = process.env.TERMS_VERSION ?? 'v1';

        return this.checkoutService.createCheckoutSession(dto, {
            ip,
            userAgent,
            termsVersion,
        });
    }

    private extractIp(req: any): string {
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
}
