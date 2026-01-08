import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
    RPTicketsV2Service,
    GenerateGuestTicketDto,
} from './rp-tickets-v2.service';
import type { AuthenticatedRequest } from '../auth/auth.types';

/**
 * Endpoints para que RPs generen y gestionen sus tickets
 */
@Controller('rp/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RP')
export class RPTicketsV2Controller {
    constructor(private readonly rpTicketsService: RPTicketsV2Service) { }

    /**
     * RP genera ticket(s) de invitado
     */
    @Post('generate')
    async generateTicket(
        @Req() req: AuthenticatedRequest,
        @Body() generateTicketDto: GenerateGuestTicketDto,
    ) {
        const rpUserId = req.user.id;
        return this.rpTicketsService.generateGuestTicket(
            rpUserId,
            generateTicketDto,
        );
    }

    /**
     * RP obtiene sus tickets generados
     */
    @Get('my-tickets')
    async getMyTickets(
        @Req() req: AuthenticatedRequest,
        @Query('status') status?: 'VALID' | 'USED' | 'CANCELLED',
        @Query('guestTypeId') guestTypeId?: string,
    ) {
        const rpUserId = req.user.id;
        return this.rpTicketsService.getMyTickets(rpUserId, {
            status,
            guestTypeId,
        });
    }

    /**
     * RP obtiene sus estadísticas
     */
    @Get('my-stats')
    async getMyStats(@Req() req: AuthenticatedRequest) {
        const rpUserId = req.user.id;
        return this.rpTicketsService.getMyStats(rpUserId);
    }

    /**
     * RP obtiene tipos de invitado disponibles
     */
    @Get('guest-types')
    async getAvailableGuestTypes(@Req() req: AuthenticatedRequest) {
        const rpUserId = req.user.id;
        return this.rpTicketsService.getAvailableGuestTypes(rpUserId);
    }
}
