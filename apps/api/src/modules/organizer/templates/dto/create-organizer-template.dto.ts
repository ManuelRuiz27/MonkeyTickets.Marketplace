import {
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Min,
} from 'class-validator';

export class CreateOrganizerTemplateDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price!: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsInt()
    @Min(1)
    quantity!: number;

    @IsOptional()
    @IsUUID('4')
    eventId?: string;
}
