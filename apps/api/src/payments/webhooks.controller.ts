import { Body, Controller, Headers, Logger, Post } from '@nestjs/common';
import { PaymentsWebhooksService } from './webhooks.service';

@Controller()
export class PaymentsWebhooksController {
    private readonly logger = new Logger(PaymentsWebhooksController.name);

    constructor(private readonly webhooksService: PaymentsWebhooksService) { }

    @Post('webhooks/mercadopago')
    async handleMercadoPago(@Body() payload: any, @Headers() headers: Record<string, string | undefined>) {
        this.logger.log({
            type: payload?.type,
            action: payload?.action,
            resourceId: payload?.data?.id,
        }, 'Mercado Pago webhook recibido');

        const signature =
            headers['x-mp-signature'] ||
            headers['x-mercadopago-signature'] ||
            headers['x-signature'];
        const requestId = headers['x-request-id'];
        await this.webhooksService.handleMercadoPagoWebhook(payload, signature, requestId);
        return { received: true };
    }
}
