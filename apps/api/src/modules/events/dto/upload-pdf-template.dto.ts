import { IsInt, Min, Max } from 'class-validator';

export class UploadPdfTemplateDto {
    @IsInt()
    @Min(0)
    qrCodeX!: number;

    @IsInt()
    @Min(0)
    qrCodeY!: number;

    @IsInt()
    @Min(50)
    @Max(300)
    qrCodeWidth!: number;
}
