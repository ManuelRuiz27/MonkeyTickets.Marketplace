import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadPdfTemplateDto } from './dto/upload-pdf-template.dto';

@Injectable()
export class EventsService {
    constructor(private prisma: PrismaService) { }

    async findAllPublic() {
        return this.prisma.event.findMany({
            where: { status: 'PUBLISHED' },
            include: {
                organizer: {
                    include: { user: true },
                },
            },
        });
    }

    async findAllByOrganizer(userId: string) {
        return this.prisma.event.findMany({
            where: {
                organizer: {
                    userId: userId
                }
            },
            include: {
                templates: true,
                organizer: true
            },
            orderBy: {
                startDate: 'asc'
            }
        });
    }

    async findAllForStaff(userId: string) {
        return this.prisma.event.findMany({
            where: {
                staff: {
                    some: {
                        userId: userId
                    }
                }
            },
            include: {
                templates: true,
                organizer: true
            },
            orderBy: {
                startDate: 'asc'
            }
        });
    }

    async findById(id: string) {
        return this.prisma.event.findUnique({
            where: { id },
            include: {
                organizer: {
                    include: { user: true },
                },
                templates: true,
            },
        });
    }

    async setPdfTemplate(
        eventId: string,
        filePath: string,
        config: UploadPdfTemplateDto,
    ) {
        return this.prisma.event.update({
            where: { id: eventId },
            data: {
                pdfTemplatePath: filePath,
                qrCodeX: config.qrCodeX,
                qrCodeY: config.qrCodeY,
                qrCodeWidth: config.qrCodeWidth,
            },
        });
    }
}
