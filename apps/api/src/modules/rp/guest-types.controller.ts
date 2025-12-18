import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
    GuestTypesService,
    CreateGuestTypeDto,
    UpdateGuestTypeDto,
} from './guest-types.service';

/**
 * Endpoints para gestión de tipos de invitado por evento
 */
@Controller('organizer/events/:eventId/guest-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class GuestTypesByEventController {
    constructor(private readonly guestTypesService: GuestTypesService) { }

    /**
     * Admin crea tipo de invitado
     */
    @Post()
    async createGuestType(
        @Param('eventId') eventId: string,
        @Req() req: any,
        @Body() createGuestTypeDto: CreateGuestTypeDto,
    ) {
        const organizerId = req.user.organizer?.id;
        return this.guestTypesService.createGuestType(organizerId, {
            ...createGuestTypeDto,
            eventId,
        });
    }

    /**
     * Admin lista tipos de invitado del evento
     */
    @Get()
    async listGuestTypes(@Param('eventId') eventId: string, @Req() req: any) {
        const organizerId = req.user.organizer?.id;
        return this.guestTypesService.listGuestTypes(eventId, organizerId);
    }

    /**
     * Admin reordena tipos de invitado
     */
    @Post('reorder')
    async reorderGuestTypes(
        @Param('eventId') eventId: string,
        @Req() req: any,
        @Body('orderedIds') orderedIds: string[],
    ) {
        const organizerId = req.user.organizer?.id;
        return this.guestTypesService.reorderGuestTypes(
            eventId,
            organizerId,
            orderedIds,
        );
    }
}

/**
 * Endpoints para gestión individual de tipos de invitado
 */
@Controller('organizer/guest-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class GuestTypesManagementController {
    constructor(private readonly guestTypesService: GuestTypesService) { }

    /**
     * Admin obtiene tipo específico
     */
    @Get(':guestTypeId')
    async getGuestType(@Param('guestTypeId') guestTypeId: string, @Req() req: any) {
        const organizerId = req.user.organizer?.id;
        return this.guestTypesService.getGuestType(guestTypeId, organizerId);
    }

    /**
     * Admin actualiza tipo de invitado
     */
    @Patch(':guestTypeId')
    async updateGuestType(
        @Param('guestTypeId') guestTypeId: string,
        @Req() req: any,
        @Body() updateGuestTypeDto: UpdateGuestTypeDto,
    ) {
        const organizerId = req.user.organizer?.id;
        return this.guestTypesService.updateGuestType(
            guestTypeId,
            organizerId,
            updateGuestTypeDto,
        );
    }

    /**
     * Admin elimina tipo de invitado
     */
    @Delete(':guestTypeId')
    async deleteGuestType(
        @Param('guestTypeId') guestTypeId: string,
        @Req() req: any,
    ) {
        const organizerId = req.user.organizer?.id;
        return this.guestTypesService.deleteGuestType(guestTypeId, organizerId);
    }
}
