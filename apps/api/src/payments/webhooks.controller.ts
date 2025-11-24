import { Body, Controller, Headers, Post } from '@nestjs/common';
import { PaymentsWebhooksService } from './webhooks.service';

@Controller('payments')
export class PaymentsWebhooksController {
    constructor(private readonly webhooksService: PaymentsWebhooksService) { }

    @Post('webhooks/mercadopago')
    async handleMercadoPago(@Body() payload: any, @Headers() headers: Record<string, string | undefined>) {
        const signature =
            headers['x-mp-signature'] ||
            headers['x-mercadopago-signature'] ||
            headers['x-signature'];
        await this.webhooksService.handleMercadoPagoWebhook(payload, signature);
        return { received: true };
    }
}
