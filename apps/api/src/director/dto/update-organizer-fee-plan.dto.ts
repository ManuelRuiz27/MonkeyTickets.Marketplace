import { IsOptional, IsUUID } from 'class-validator';

export class UpdateOrganizerFeePlanDto {
    @IsOptional()
    @IsUUID('4')
    feePlanId?: string;
}
