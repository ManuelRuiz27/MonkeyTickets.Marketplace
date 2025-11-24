import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateFeePlanDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    platformFeePercent?: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    platformFeeFixed?: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    paymentGatewayFeePercent?: number;

    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}
