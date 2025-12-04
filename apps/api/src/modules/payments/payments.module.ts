import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentsController } from '../../payments/payments.controller';
import { PaymentsService } from '../../payments/payments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsWebhooksController } from '../../payments/webhooks.controller';
import { PaymentsWebhooksService } from '../../payments/webhooks.service';
import { PaymentTasksService } from '../../payments/payment-tasks.service';
import { ORDER_FULFILLMENT_QUEUE } from '../../payments/payment.constants';
import { OrderFulfillmentProcessor } from '../../payments/order-fulfillment.processor';
import { MailModule } from '../mail/mail.module';
import { EmailModule } from '../email/email.module';
import { PaymentsConfigModule } from './payments-config.module';
import { OpenpayModule } from './openpay/openpay.module';
import { MercadoPagoModule } from './mercadopago/mercadopago.module';

@Module({
    imports: [
        PrismaModule,
        MailModule,
        EmailModule,
        PaymentsConfigModule,
        OpenpayModule,
        MercadoPagoModule,
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                redis: {
                    url: config.get<string>('REDIS_URL'),
                    maxRetriesPerRequest: null,
                    enableReadyCheck: false,
                },
            }),
        }),
        BullModule.registerQueue({
            name: ORDER_FULFILLMENT_QUEUE,
        }),
    ],
    controllers: [PaymentsController, PaymentsWebhooksController],
    providers: [
        PaymentsService,
        PaymentsWebhooksService,
        PaymentTasksService,
        OrderFulfillmentProcessor,
    ],
})
export class PaymentsModule { }
