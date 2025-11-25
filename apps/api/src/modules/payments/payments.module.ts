import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PaymentsController } from '../../payments/payments.controller';
import { PaymentsService } from '../../payments/payments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsWebhooksController } from '../../payments/webhooks.controller';
import { PaymentsWebhooksService } from '../../payments/webhooks.service';
import { PaymentTasksService } from '../../payments/payment-tasks.service';
import { ORDER_FULFILLMENT_QUEUE } from '../../payments/payment.constants';
import { OrderFulfillmentProcessor } from '../../payments/order-fulfillment.processor';
import { MailModule } from '../mail/mail.module';
import { PaymentsConfigModule } from './payments-config.module';
import { OpenpayModule } from './openpay/openpay.module';
import { MercadoPagoModule } from './mercadopago/mercadopago.module';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let redisHost = 'localhost';
let redisPort = 6379;
let redisPassword: string | undefined;

try {
    const parsed = new URL(redisUrl);
    redisHost = parsed.hostname || redisHost;
    redisPort = parsed.port ? Number(parsed.port) : redisPort;
    redisPassword = parsed.password || undefined;
} catch {
    // use defaults
}

@Module({
    imports: [
        PrismaModule,
        MailModule,
        PaymentsConfigModule,
        OpenpayModule,
        MercadoPagoModule,
        BullModule.forRoot({
            redis: {
                host: redisHost,
                port: redisPort,
                password: redisPassword,
            },
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
