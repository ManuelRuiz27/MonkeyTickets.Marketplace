import { Module } from '@nestjs/common';
import { PaymentsConfigModule } from '../payments-config.module';
import { MercadoPagoController } from './mercadopago.controller';
import { MercadoPagoService } from './mercadopago.service';

@Module({
    imports: [PaymentsConfigModule],
    controllers: [MercadoPagoController],
    providers: [MercadoPagoService],
    exports: [MercadoPagoService],
})
export class MercadoPagoModule { }
