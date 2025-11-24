import { Body, Controller, Post, Req } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Controller('checkout')
export class CheckoutController {
    constructor(private readonly checkoutService: CheckoutService) { }

    @Post('session')
    async createSession(
        @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
        @Req() req: any,
    ) {
        return this.handleSessionCreation(createCheckoutSessionDto, req);
    }

    // Legacy support while frontend finishes migration.
    @Post()
    async createLegacySession(
        @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
        @Req() req: any,
    ) {
        return this.handleSessionCreation(createCheckoutSessionDto, req);
    }

    private handleSessionCreation(dto: CreateCheckoutSessionDto, req: any) {
        const ip = this.extractIp(req);
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
}
