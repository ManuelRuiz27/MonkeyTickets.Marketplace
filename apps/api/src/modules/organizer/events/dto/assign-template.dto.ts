import { IsUUID } from 'class-validator';

export class AssignTemplateDto {
    @IsUUID('4')
    templateId!: string;
}
