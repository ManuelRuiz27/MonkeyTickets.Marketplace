import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadPdfTemplateDto } from './dto/upload-pdf-template.dto';
import { EventFiltersDto } from './dto/event-filters.dto';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EventsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Obtiene todos los eventos p?blicos aplicando filtros y paginaci?n
     */
    async findAllPublic(filters: EventFiltersDto = {}) {
        const page = filters.page && filters.page > 0 ? filters.page : 1;
        const limitValue = filters.limit && filters.limit > 0 ? filters.limit : 20;
        const limit = Math.min(Math.max(limitValue, 1), 100);
        const skip = (page - 1) * limit;
        const where = this.buildPublicEventsWhere(filters);

        const [events, total] = await this.prisma.$transaction([
            this.prisma.event.findMany({
                where,
                include: {
                    organizer: {
                        include: { user: true },
                    },
                    templates: true,
                },
                orderBy: {
                    startDate: 'asc'
                },
                skip,
                take: limit,
            }),
            this.prisma.event.count({ where }),
        ]);

        return {
            data: events,
            pagination: {
                page,
                limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            },
        };
    }

    private buildPublicEventsWhere(filters: EventFiltersDto): Prisma.EventWhereInput {
        const where: Prisma.EventWhereInput = {
            status: 'PUBLISHED',
            isPublic: true,
            isUnlisted: false,
        };

        if (filters.category) {
            where.category = filters.category;
        }

        if (filters.city) {
            where.city = {
                contains: filters.city,
                mode: 'insensitive',
            };
        }

        if (filters.dateFrom || filters.dateTo) {
            where.startDate = {};
            if (filters.dateFrom) {
                where.startDate.gte = new Date(filters.dateFrom);
            }
            if (filters.dateTo) {
                where.startDate.lte = new Date(filters.dateTo);
            }
        }

        if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
            where.price = {};
            if (filters.priceMin !== undefined) {
                where.price.gte = filters.priceMin;
            }
            if (filters.priceMax !== undefined) {
                where.price.lte = filters.priceMax;
            }
        }

        if (filters.search) {
            where.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        return where;
    }

    /**
     * Busca un evento por token de acceso (Modelo B - Unlisted)
     * @param token Token de acceso
     */
    async findByAccessToken(token: string) {
        const event = await this.prisma.event.findFirst({
            where: {
                accessToken: token,
                status: 'PUBLISHED',
                isUnlisted: true,
            },
            include: {
                organizer: {
                    include: { user: true },
                },
                templates: true,
            },
        });

        if (!event) {
            throw new NotFoundException('Evento no encontrado o token inv?lido');
        }

        return event;
    }

    /**
     * Genera un token ?nico para evento unlisted
     * @param eventId ID del evento
     */
    async generateAccessToken(eventId: string): Promise<string> {
        // Genera token seguro y ?nico
        const token = randomBytes(16).toString('hex');

        await this.prisma.event.update({
            where: { id: eventId },
            data: {
                isUnlisted: true,
                accessToken: token,
            },
        });

        return token;
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
