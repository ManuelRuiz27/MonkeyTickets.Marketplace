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
    ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
    GuestTypesService,
    CreateGuestTypeDto,
    UpdateGuestTypeDto,
} from './guest-types.service';
import type { AuthenticatedRequest } from '../auth/auth.types';

function requireOrganizerId(req: AuthenticatedRequest): string {
    const organizerId = req.user.organizer?.id;
    if (!organizerId) {
        throw new ForbiddenException('Organizer context is required.');
    }
    return organizerId;
}

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
        @Req() req: AuthenticatedRequest,
        @Body() createGuestTypeDto: CreateGuestTypeDto,
    ) {
        const organizerId = requireOrganizerId(req);
        return this.guestTypesService.createGuestType(organizerId, {
            ...createGuestTypeDto,
            eventId,
        });
    }

    /**
     * Admin lista tipos de invitado del evento
     */
    @Get()
    async listGuestTypes(@Param('eventId') eventId: string, @Req() req: AuthenticatedRequest) {
        const organizerId = requireOrganizerId(req);
        return this.guestTypesService.listGuestTypes(eventId, organizerId);
    }

    /**
     * Admin reordena tipos de invitado
     */
    @Post('reorder')
    async reorderGuestTypes(
        @Param('eventId') eventId: string,
        @Req() req: AuthenticatedRequest,
        @Body('orderedIds') orderedIds: string[],
    ) {
        const organizerId = requireOrganizerId(req);
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
    async getGuestType(@Param('guestTypeId') guestTypeId: string, @Req() req: AuthenticatedRequest) {
        const organizerId = requireOrganizerId(req);
        return this.guestTypesService.getGuestType(guestTypeId, organizerId);
    }

    /**
     * Admin actualiza tipo de invitado
     */
    @Patch(':guestTypeId')
    async updateGuestType(
        @Param('guestTypeId') guestTypeId: string,
        @Req() req: AuthenticatedRequest,
        @Body() updateGuestTypeDto: UpdateGuestTypeDto,
    ) {
        const organizerId = requireOrganizerId(req);
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
        @Req() req: AuthenticatedRequest,
    ) {
        const organizerId = requireOrganizerId(req);
        return this.guestTypesService.deleteGuestType(guestTypeId, organizerId);
    }
}
