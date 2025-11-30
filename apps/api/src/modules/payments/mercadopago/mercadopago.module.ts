import { Module } from '@nestjs/common';
import { PaymentsConfigModule } from '../payments-config.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { MercadoPagoController } from './mercadopago.controller';
import { MercadoPagoService } from './mercadopago.service';

@Module({
    imports: [PaymentsConfigModule, PrismaModule],
    controllers: [MercadoPagoController],
    providers: [MercadoPagoService],
    exports: [MercadoPagoService],
})
export class MercadoPagoModule { }
