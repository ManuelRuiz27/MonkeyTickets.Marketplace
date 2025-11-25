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

    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsInt()
    @Min(1)
    quantity!: number;

    @IsNumber()
    @IsPositive()
    unitPrice!: number;

    @IsString()
    @IsIn(['MXN'])
    currency!: 'MXN';

    @IsOptional()
    @IsUrl({
        require_protocol: true,
    })
    notificationUrl?: string;

    @ValidateNested()
    @Type(() => MercadoPagoPayerDto)
    payer!: MercadoPagoPayerDto;
}
