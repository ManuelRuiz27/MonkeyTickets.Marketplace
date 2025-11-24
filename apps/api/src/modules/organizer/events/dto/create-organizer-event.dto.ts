import { EventStatus } from '@prisma/client';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsISO8601,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateOrganizerEventDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsISO8601()
    startDate!: string;

    @IsOptional()
    @IsISO8601()
    endDate?: string;

    @IsInt()
    @Min(0)
    capacity!: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price!: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsBoolean()
    isPublic?: boolean;

    @IsOptional()
    @IsEnum(EventStatus)
    status?: EventStatus;

    @IsOptional()
    @IsString()
    venue?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    coverImage?: string;

    @IsOptional()
    @IsString()
    category?: string;
}
