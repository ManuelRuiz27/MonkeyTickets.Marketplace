import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { PaginationQueryDto } from './pagination.dto';

export class SearchOrdersDto extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    orderId?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsUUID('4')
    eventId?: string;

    @IsOptional()
    @IsUUID('4')
    organizerId?: string;

    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;
}
