import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';

@Controller('director/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DIRECTOR')
export class DirectorLogsController {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lista WebhookLogs recientes con filtros básicos
     * GET /director/logs/webhooks?gateway=mercadopago&limit=50
     */
    @Get('webhooks')
    async listWebhookLogs(
        @Query('gateway') gateway?: string,
        @Query('limit') limit = '50',
    ) {
        const take = Math.min(Number(limit) || 50, 200);

        return this.prisma.webhookLog.findMany({
            where: gateway ? { gateway } : {},
            orderBy: { createdAt: 'desc' },
            take,
        });
    }

    /**
     * Lista LegalLogs recientes relacionados con pagos
     * GET /director/logs/legal?action=PAYMENT_WEBHOOK&limit=50
     */
    @Get('legal')
    async listLegalLogs(
        @Query('action') action?: string,
        @Query('limit') limit = '50',
    ) {
        const take = Math.min(Number(limit) || 50, 200);

        return this.prisma.legalLog.findMany({
            where: action ? { action } : {},
            orderBy: { createdAt: 'desc' },
            take,
        });
    }
}

