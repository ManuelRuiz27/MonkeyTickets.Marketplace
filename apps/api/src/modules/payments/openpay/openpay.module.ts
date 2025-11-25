import { Module } from '@nestjs/common';
import { PaymentsConfigModule } from '../payments-config.module';
import { OpenpayController } from './openpay.controller';
import { OpenpayService } from './openpay.service';

@Module({
    imports: [PaymentsConfigModule],
    controllers: [OpenpayController],
    providers: [OpenpayService],
    exports: [OpenpayService],
})
export class OpenpayModule { }
