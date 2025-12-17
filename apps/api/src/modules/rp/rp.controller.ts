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
import { RPService, CreateRPDto, UpdateRPDto } from './rp.service';
import { RPDashboardService } from './rp-dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('organizer/events/:eventId/rps')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class RPController {
    constructor(
        private readonly rpService: RPService,
        private readonly rpDashboardService: RPDashboardService,
    ) { }

    /**
     * Crear un nuevo RP para el evento
     */
    @Post()
    async createRP(
        @Param('eventId') eventId: string,
        @Req() req: any,
        @Body() createRPDto: CreateRPDto,
    ) {
        return this.rpService.createRP(eventId, req.user.userId, createRPDto);
    }

    /**
     * Listar todos los RPs del evento
     */
    @Get()
    async listRPs(@Param('eventId') eventId: string, @Req() req: any) {
        return this.rpService.listRPsByEvent(eventId, req.user.userId);
    }

    /**
     * Obtener dashboard de RPs del evento
     */
    @Get('dashboard')
    async getRPDashboard(@Param('eventId') eventId: string, @Req() req: any) {
        return this.rpDashboardService.getEventRPDashboard(eventId, req.user.userId);
    }

    /**
     * Exportar reporte de RPs
     */
    @Get('dashboard/export')
    async exportRPReport(@Param('eventId') eventId: string, @Req() req: any) {
        return this.rpDashboardService.exportRPReport(eventId, req.user.userId);
    }
}

@Controller('organizer/rps')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class RPManagementController {
    constructor(private readonly rpService: RPService) { }

    /**
     * Obtener un RP específico
     */
    @Get(':rpId')
    async getRP(@Param('rpId') rpId: string, @Req() req: any) {
        return this.rpService.getRPById(rpId, req.user.userId);
    }

    /**
     * Actualizar un RP
     */
    @Patch(':rpId')
    async updateRP(
        @Param('rpId') rpId: string,
        @Req() req: any,
        @Body() updateRPDto: UpdateRPDto,
    ) {
        return this.rpService.updateRP(rpId, req.user.userId, updateRPDto);
    }

    /**
     * Eliminar un RP
     */
    @Delete(':rpId')
    async deleteRP(@Param('rpId') rpId: string, @Req() req: any) {
        return this.rpService.deleteRP(rpId, req.user.userId);
    }

    /**
     * Obtener métricas detalladas de un RP
     */
    @Get(':rpId/metrics')
    async getRPMetrics(@Param('rpId') rpId: string, @Req() req: any) {
        return this.rpService.getRPMetrics(rpId, req.user.userId);
    }
}

@Controller('rp')
export class RPPublicController {
    constructor(private readonly rpService: RPService) { }

    /**
     * Obtener información pública de un RP (sin autenticación)
     */
    @Get(':rpCode/info')
    async getRPInfo(@Param('rpCode') rpCode: string) {
        return this.rpService.getRPPublicInfo(rpCode);
    }
}
