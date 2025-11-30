import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { CreateMercadoPagoPreferenceDto } from './create-preference.dto';
import { MercadoPagoService } from './mercadopago.service';

@Controller('payments/mercadopago')
export class MercadoPagoController {
    constructor(private readonly mercadoPagoService: MercadoPagoService) { }

    @Post('preference')
    @Public()
    @HttpCode(HttpStatus.CREATED)
    async createPreference(@Body() dto: CreateMercadoPagoPreferenceDto, @Req() req: any) {
        try {
            return await this.mercadoPagoService.createPreference({
                orderId: dto.orderId,
                notificationUrl: dto.notificationUrl,
            });
        } catch (error) {
            console.error('Error creating Mercado Pago preference:', error);
            throw error;
        }
    }
}
