import { IsEnum } from 'class-validator';

export enum DirectorOrganizerStatus {
    APPROVED = 'APPROVED',
    PENDING = 'PENDING',
    BLOCKED = 'BLOCKED',
}

export class UpdateOrganizerStatusDto {
    @IsEnum(DirectorOrganizerStatus)
    status!: DirectorOrganizerStatus;
}
