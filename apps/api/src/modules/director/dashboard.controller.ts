import { Controller, Get, Post, Param, UseGuards, Req, Body } from '@nestjs/common';
import { OrganizerDashboardService } from './organizer-dashboard.service';
import { DirectorDashboardService } from './director-dashboard.service';
import { ComplimentaryTicketsService } from '../tickets/complimentary-tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { Request } from 'express';
import type { AuthenticatedRequest } from '../auth/auth.types';

/**
 * Controlador del panel del organizador (MVP Épica 4)
 */
@Controller('organizer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class OrganizerController {
    constructor(
        private dashboardService: OrganizerDashboardService,
        private cortesiasService: ComplimentaryTicketsService,
    ) { }

    /**
     * Resumen general del organizador
     * GET /organizer/dashboard
     */
    @Get('dashboard')
    async getDashboard(@Req() req: AuthenticatedRequest) {
        return this.dashboardService.getOrganizerSummary(this.getUserId(req));
    }

    /**
     * Métricas de un evento específico
     * GET /organizer/events/:id/metrics
     */
    @Get('events/:id/metrics')
    async getEventMetrics(@Param('id') eventId: string, @Req() req: AuthenticatedRequest) {
        return this.dashboardService.getEventMetrics(eventId, this.getUserId(req));
    }

    /**
     * Lista de órdenes de un evento
     * GET /organizer/events/:id/orders
     */
    @Get('events/:id/orders')
    async getEventOrders(@Param('id') eventId: string, @Req() req: AuthenticatedRequest) {
        return this.dashboardService.getEventOrders(eventId, this.getUserId(req));
    }

    /**
     * Estadísticas de cortesías
     * GET /organizer/cortesias/stats
     */
    @Get('cortesias/stats')
    async getCortesiasStats(@Req() req: AuthenticatedRequest) {
        const summary = await this.dashboardService.getOrganizerSummary(this.getUserId(req));
        return summary?.cortesias || null;
    }

    /**
     * Generar cortesías para un evento
     * POST /organizer/events/:id/cortesias
     */
    @Post('events/:id/cortesias')
    async generateCortesias(
        @Param('id') eventId: string,
        @Req() req: AuthenticatedRequest,
        @Body() dto: {
            quantity: number;
            buyerName: string;
            buyerEmail: string;
            buyerPhone?: string;
        }
    ) {
        const summary = await this.dashboardService.getOrganizerSummary(this.getUserId(req));
        if (!summary) {
            throw new Error('Organizador no encontrado');
        }

        return this.cortesiasService.generateComplimentaryTickets(
            summary.organizerId,
            eventId,
            dto.quantity,
            {
                name: dto.buyerName,
                email: dto.buyerEmail,
                phone: dto.buyerPhone,
            }
        );
    }

    private getUserId(req: AuthenticatedRequest) {
        return req.user.userId ?? req.user.id;
    }
}

/**
 * Controlador del panel del director (MVP Épica 5)
 */
@Controller('director')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DIRECTOR', 'ADMIN')
export class DirectorController {
    constructor(private dashboardService: DirectorDashboardService) { }

    /**
     * Métricas globales de la plataforma
     * GET /director/metrics
     */
    @Get('metrics')
    async getMetrics() {
        return this.dashboardService.getGlobalMetrics();
    }

    /**
     * Lista de organizadores
     * GET /director/organizers?status=PENDING
     */
    @Get('organizers')
    async listOrganizers(@Req() req: Request) {
        const statusValue = req.query.status;
        const status =
            typeof statusValue === 'string'
                ? statusValue
                : Array.isArray(statusValue) && typeof statusValue[0] === 'string'
                    ? statusValue[0]
                    : undefined;
        return this.dashboardService.listOrganizers(status);
    }

    /**
     * Aprobar organizador
     * POST /director/organizers/:id/approve
     */
    @Post('organizers/:id/approve')
    async approveOrganizer(@Param('id') organizerId: string) {
        return this.dashboardService.approveOrganizer(organizerId);
    }

    /**
     * Suspender organizador
     * POST /director/organizers/:id/suspend
     */
    @Post('organizers/:id/suspend')
    async suspendOrganizer(@Param('id') organizerId: string) {
        return this.dashboardService.suspendOrganizer(organizerId);
    }

    /**
     * Detalles completos de una orden
     * GET /director/orders/:id
     */
    @Get('orders/:id')
    async getOrderDetails(@Param('id') orderId: string) {
        return this.dashboardService.getOrderDetails(orderId);
    }

    /**
     * Reenviar tickets de una orden
     * POST /director/orders/:id/resend-tickets
     */
    @Post('orders/:id/resend-tickets')
    async resendTickets(@Param('id') orderId: string) {
        return this.dashboardService.resendTickets(orderId);
    }

    /**
     * Asignar fee plan a organizador
     * POST /director/organizers/:id/fee-plan
     */
    @Post('organizers/:id/fee-plan')
    async assignFeePlan(
        @Param('id') organizerId: string,
        @Body() dto: { feePlanId: string }
    ) {
        return this.dashboardService.assignFeePlan(organizerId, dto.feePlanId);
    }
}
