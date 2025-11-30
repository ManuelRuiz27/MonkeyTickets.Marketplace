import { Type } from 'class-transformer';
import {
    IsEmail,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    IsUrl,
    Min,
    ValidateNested,
} from 'class-validator';

class MercadoPagoPayerDto {
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsOptional()
    @IsString()
    name?: string;
}

export class CreateMercadoPagoPreferenceDto {
    @IsString()
    @IsNotEmpty()
    orderId!: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    quantity?: number;

    @IsOptional()
    @IsNumber()
    @IsPositive()
    unitPrice?: number;

    @IsOptional()
    @IsString()
    @IsIn(['MXN'])
    currency?: 'MXN';

    @IsOptional()
    @IsUrl({
        require_protocol: true,
    })
    notificationUrl?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => MercadoPagoPayerDto)
    payer?: MercadoPagoPayerDto;
}
