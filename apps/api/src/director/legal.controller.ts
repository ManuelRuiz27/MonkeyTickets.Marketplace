import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { LegalService } from '../legal/legal.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';

@Controller('director/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DIRECTOR')
export class DirectorLegalController {
    constructor(private readonly legalService: LegalService) { }

    @Get(':orderId/logs')
    async getOrderLogs(@Param('orderId') orderId: string) {
        return this.legalService.findLogsByOrder(orderId);
    }
}
