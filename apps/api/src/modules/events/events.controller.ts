import { Controller, Get, Param, Post, Body, Query, UploadedFile, UseInterceptors, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { v4 as uuidv4 } from 'uuid';
import { EventFiltersDto } from './dto/event-filters.dto';

/** Controlador público de eventos */
@Controller('public/events')
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    @Get()
    async findAll(@Query() filters: EventFiltersDto) {
        return this.eventsService.findAllPublic(filters);
    }

    /**
     * Buscar eventos con filtros (MVP Épica 1)
     * GET /public/events/search?category=musica&city=guadalajara
     */
    @Get('search')
    async searchEvents(@Query() filters: EventFiltersDto) {
        return this.eventsService.findAllPublic(filters);
    }

    /**
     * Acceder a evento unlisted por token (Modelo B)
     * GET /public/events/unlisted/:token
     */
    @Get('unlisted/:token')
    async getUnlistedEvent(@Param('token') token: string) {
        return this.eventsService.findByAccessToken(token);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.eventsService.findById(id);
    }
}

/** Controlador de eventos del organizador */
@Controller('organizer/events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZER', 'STAFF')
export class OrganizerEventsController {
    constructor(private readonly eventsService: EventsService) { }

    @Get()
    async getOrganizerEvents(@Req() req: any) {
        if (req.user.role === 'STAFF') {
            return this.eventsService.findAllForStaff(req.user.userId);
        }
        return this.eventsService.findAllByOrganizer(req.user.userId);
    }

    @Post(':id/pdf-template')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: path.join(process.cwd(), 'uploads', 'pdf-templates'),
                filename: (req, file, cb) => {
                    const ext = file.originalname.split('.').pop();
                    const uniqueName = `${uuidv4()}.${ext}`;
                    cb(null, uniqueName);
                },
            }),
            fileFilter: (req, file, cb) => {
                const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
                if (validTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new BadRequestException('Solo se permiten archivos PDF, JPG o PNG'), false);
                }
            },
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
        }),
    )
    async uploadPdfTemplate(
        @Param('id') eventId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: any,
    ) {
        if (!file) {
            throw new BadRequestException('No se proporcionó ningún archivo');
        }
        const parsedDto = {
            qrCodeX: Number(dto.qrCodeX),
            qrCodeY: Number(dto.qrCodeY),
            qrCodeWidth: Number(dto.qrCodeWidth),
        };
        return this.eventsService.setPdfTemplate(eventId, file.path, parsedDto);
    }

    /**
     * Generar token de acceso para evento unlisted (Modelo B)
     * POST /organizer/events/:id/access-token
     */
    @Post(':id/access-token')
    async generateAccessToken(
        @Param('id') eventId: string,
        @Req() req: any
    ) {
        const event = await this.eventsService.findById(eventId);
        if (!event || event.organizer.userId !== req.user.userId) {
            throw new BadRequestException('No autorizado');
        }

        const token = await this.eventsService.generateAccessToken(eventId);
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        return {
            token,
            url: `${baseUrl}/events/unlisted/${token}`,
            message: 'Token generado. Comparte esta URL para acceso directo al evento.'
        };
    }
}
