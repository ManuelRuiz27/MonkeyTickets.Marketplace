import { IsString, IsEmail, IsNotEmpty, IsNumber, Min, IsUUID } from 'class-validator';

export class CreateCheckoutDto {
    @IsUUID()
    eventId!: string;

    @IsUUID()
    templateId!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;

    @IsEmail()
    email!: string;

    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    phone!: string;
}
