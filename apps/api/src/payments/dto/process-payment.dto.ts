import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export type PaymentProvider = 'mercadopago';
export type PaymentMethod = 'card' | 'google_pay' | 'apple_pay' | 'spei' | 'oxxo';

export class ProcessPaymentDto {
    @IsUUID('4')
    orderId!: string;

    @IsIn(['mercadopago'])
    provider!: PaymentProvider;

    @IsIn(['card', 'google_pay', 'apple_pay', 'spei', 'oxxo'])
    method!: PaymentMethod;

    @IsString()
    token!: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    installments?: number;
}
