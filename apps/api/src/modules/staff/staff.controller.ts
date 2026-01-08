import { Body, Controller, Delete, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffSessionDto } from './dto/create-staff-session.dto';
import { VerifyStaffTokenDto } from './dto/verify-staff-token.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';

@Controller('staff')
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ORGANIZER')
    @Post('sessions')
    async createSession(@Req() req: AuthenticatedRequest, @Body() dto: CreateStaffSessionDto) {
        const { token, session } = await this.staffService.createSession(req.user.id, dto);
        return {
            id: session.id,
            event: session.event,
            expiresAt: session.expiresAt,
            token,
        };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ORGANIZER')
    @Get('sessions')
    listSessions(@Req() req: AuthenticatedRequest) {
        return this.staffService.listOrganizerSessions(req.user.id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ORGANIZER')
    @Delete('sessions/:id')
    revokeSession(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        return this.staffService.revokeSession(req.user.id, id);
    }

    @Post('sessions/verify')
    async verifyToken(@Body() dto: VerifyStaffTokenDto) {
        const session = await this.staffService.verifyToken(dto.token);
        await this.staffService.touchSession(session.id);
        return {
            sessionId: session.id,
            event: session.event,
            organizer: session.organizer,
            expiresAt: session.expiresAt,
        };
    }
}
