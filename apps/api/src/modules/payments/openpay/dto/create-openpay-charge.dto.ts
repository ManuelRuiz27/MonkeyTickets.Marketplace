import { Type } from 'class-transformer';
import {
    IsEmail,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
import type { components } from '@monomarket/contracts';

type OpenpayChargeRequest = components['schemas']['OpenpayChargeRequest'];
type OpenpayChargeCustomer = OpenpayChargeRequest['customer'];

export class OpenpayChargeCustomerDto implements OpenpayChargeCustomer {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    last_name!: string;

    @IsString()
    @IsEmail()
    email!: string;

    @IsString()
    @IsNotEmpty()
    phone_number!: string;
}

export class CreateOpenpayChargeDto implements OpenpayChargeRequest {
    @IsNumber()
    @Min(1)
    amount!: number;

    @IsString()
    @IsIn(['MXN'])
    currency!: 'MXN';

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsString()
    @IsNotEmpty()
    orderId!: string;

    @IsString()
    @IsNotEmpty()
    tokenId!: string;

    @IsString()
    @IsNotEmpty()
    deviceSessionId!: string;

    @ValidateNested()
    @Type(() => OpenpayChargeCustomerDto)
    customer!: OpenpayChargeCustomerDto;
}
