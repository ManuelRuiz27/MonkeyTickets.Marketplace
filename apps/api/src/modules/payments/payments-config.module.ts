import { Global, Module } from '@nestjs/common';
import { PaymentsConfigService } from '../../payments/payments.config';

@Global()
@Module({
    providers: [PaymentsConfigService],
    exports: [PaymentsConfigService],
})
export class PaymentsConfigModule { }
