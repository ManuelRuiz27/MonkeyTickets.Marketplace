import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('pay')
    async pay(@Body() dto: ProcessPaymentDto) {
        return this.paymentsService.processPayment(dto);
    }
}
