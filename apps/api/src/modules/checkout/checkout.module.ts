import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { ReservationService } from './reservation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LegalModule } from '../legal/legal.module';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { CaptchaService } from '../../common/services/captcha.service';

@Module({
    imports: [PrismaModule, LegalModule],
    controllers: [CheckoutController],
    providers: [CheckoutService, ReservationService, RateLimitService, CaptchaService],
    exports: [CheckoutService, ReservationService],
})
export class CheckoutModule { }
