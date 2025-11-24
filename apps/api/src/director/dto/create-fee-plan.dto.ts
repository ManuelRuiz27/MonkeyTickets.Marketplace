import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateFeePlanDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    platformFeePercent!: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    platformFeeFixed!: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    paymentGatewayFeePercent!: number;

    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}
