import { IsOptional, IsString, IsDateString, IsNumber, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para filtros de marketplace de eventos públicos
 */
export class EventFiltersDto {
    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    priceMin?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    priceMax?: number;

    @IsOptional()
    @IsString()
    search?: string; // Búsqueda por título/descripción

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;

}