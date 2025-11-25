import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateMercadoPagoPreferenceDto } from './create-preference.dto';
import { MercadoPagoService } from './mercadopago.service';

@Controller('payments/mercadopago')
export class MercadoPagoController {
    constructor(private readonly mercadoPagoService: MercadoPagoService) { }

    @Post('preference')
    @HttpCode(HttpStatus.CREATED)
    async createPreference(@Body() dto: CreateMercadoPagoPreferenceDto) {
        return this.mercadoPagoService.createPreference({
            orderId: dto.orderId,
            title: dto.title,
            description: dto.description,
            quantity: dto.quantity,
            unitPrice: dto.unitPrice,
            currency: dto.currency,
            notificationUrl: dto.notificationUrl,
            payer: {
                email: dto.payer.email,
                name: dto.payer.name,
            },
        });
    }
}
