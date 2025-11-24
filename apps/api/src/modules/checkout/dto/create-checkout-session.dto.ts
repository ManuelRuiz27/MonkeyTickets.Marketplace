import {
    IsEmail,
    IsNotEmpty,
    IsString,
    IsUUID,
    ValidateNested,
    IsInt,
    Min,
    ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class CheckoutTicketDto {
    @IsUUID('4')
    templateId!: string;

    @IsInt()
    @Min(1)
    quantity!: number;
}

export class CreateCheckoutSessionDto {
    @ValidateNested({ each: true })
    @Type(() => CheckoutTicketDto)
    @ArrayMinSize(1)
    tickets!: CheckoutTicketDto[];

    @IsUUID('4')
    eventId!: string;

    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsEmail()
    email!: string;

    @IsString()
    @IsNotEmpty()
    phone!: string;
}
