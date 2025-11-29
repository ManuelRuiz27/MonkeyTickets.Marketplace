import { Module } from '@nestjs/common';
import { PaymentsConfigModule } from '../payments-config.module';
import { OpenpayController } from './openpay.controller';
import { OpenpayWebhookController } from './openpay-webhook.controller';
import { OpenpayService } from './openpay.service';
import { OpenpayAlternativePaymentsService } from './openpay-alternative.service';
import { PaymentTasksService } from './payment-tasks.service';

import { EmailModule } from '../../email/email.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PaymentsConfigModule, EmailModule, PrismaModule],
    controllers: [OpenpayController, OpenpayWebhookController],
    providers: [OpenpayService, OpenpayAlternativePaymentsService, PaymentTasksService],
    exports: [OpenpayService, OpenpayAlternativePaymentsService],
})
export class OpenpayModule { }
