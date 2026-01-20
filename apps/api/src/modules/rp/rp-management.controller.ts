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
    RPManagementService,
    CreateRPUserDto,
    UpdateRPProfileDto,
} from './rp-management.service';
import type { AuthenticatedRequest } from '../auth/auth.types';

function requireOrganizerId(req: AuthenticatedRequest): string {
    const organizerId = req.user.organizer?.id;
    if (!organizerId) {
        throw new ForbiddenException('Organizer context is required.');
    }
    return organizerId;
}

@Controller('organizer/events/:eventId/rp-users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class RPUsersController {
    constructor(private readonly rpManagementService: RPManagementService) { }

    /**
     * Admin crea usuario RP
     */
    @Post()
    async createRPUser(
        @Param('eventId') eventId: string,
        @Req() req: AuthenticatedRequest,
        @Body() createRPUserDto: CreateRPUserDto,
    ) {
        const organizerId = requireOrganizerId(req);
        return this.rpManagementService.createRPUser(organizerId, {
            ...createRPUserDto,
            eventId,
        });
    }

    /**
     * Admin lista RPs del evento
     */
    @Get()
    async listRPUsers(
        @Param('eventId') eventId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const organizerId = requireOrganizerId(req);
        return this.rpManagementService.listRPsByEvent(eventId, organizerId);
    }
}

@Controller('organizer/rp-users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class RPUserManagementController {
    constructor(private readonly rpManagementService: RPManagementService) { }

    /**
     * Admin obtiene RP específico
     */
    @Get(':rpProfileId')
    async getRPProfile(
        @Param('rpProfileId') rpProfileId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const organizerId = requireOrganizerId(req);
        return this.rpManagementService.getRPProfile(rpProfileId, organizerId);
    }

    /**
     * Admin actualiza RP
     */
    @Patch(':rpProfileId')
    async updateRPProfile(
        @Param('rpProfileId') rpProfileId: string,
        @Req() req: AuthenticatedRequest,
        @Body() updateRPProfileDto: UpdateRPProfileDto,
    ) {
        const organizerId = requireOrganizerId(req);
        return this.rpManagementService.updateRPProfile(
            rpProfileId,
            organizerId,
            updateRPProfileDto,
        );
    }

    /**
     * Admin elimina RP
     */
    @Delete(':rpProfileId')
    async deleteRPUser(
        @Param('rpProfileId') rpProfileId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const organizerId = requireOrganizerId(req);
        return this.rpManagementService.deleteRPUser(rpProfileId, organizerId);
    }

    /**
     * Admin toggle activo/inactivo
     */
    @Post(':rpProfileId/toggle')
    async toggleRPStatus(
        @Param('rpProfileId') rpProfileId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const organizerId = requireOrganizerId(req);
        return this.rpManagementService.toggleRPStatus(rpProfileId, organizerId);
    }

    /**
     * Admin resetea password
     */
    @Post(':rpProfileId/reset-password')
    async resetRPPassword(
        @Param('rpProfileId') rpProfileId: string,
        @Req() req: AuthenticatedRequest,
        @Body('newPassword') newPassword: string,
    ) {
        const organizerId = requireOrganizerId(req);
        return this.rpManagementService.resetRPPassword(
            rpProfileId,
            organizerId,
            newPassword,
        );
    }
}
