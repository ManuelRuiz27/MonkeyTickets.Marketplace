import { Controller, Get, Param, StreamableFile, Post, UseGuards, HttpException, HttpStatus, Req } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { StaffAuthGuard, StaffAuthenticatedRequest } from '../staff/guards/staff-auth.guard';
import { RateLimitService } from '../../common/services/rate-limit.service';


@Controller('tickets')
export class TicketsController {
    constructor(
        private readonly ticketsService: TicketsService,
        private readonly rateLimit: RateLimitService,
    ) { }

    @Get(':id/pdf')
    async downloadPdf(@Param('id') id: string): Promise<StreamableFile> {
        const { stream, filename } = await this.ticketsService.generateTicketPdf(id);

        return new StreamableFile(stream, {
            type: 'application/pdf',
            disposition: `attachment; filename="${filename}"`,
        });
    }

    @Get('verify/:token')
    @UseGuards(StaffAuthGuard)
    async verifyTicket(
        @Param('token') token: string,
        @Req() req: StaffAuthenticatedRequest & { ip?: string },
    ) {
        this.ensureRateLimit(`verify:${req.staffSession?.id}:${req.ip}`, 15, 10_000);
        try {
            return await this.ticketsService.verifyTicketToken(token, req.staffSession!);
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                // Errores de dominio ya normalizados
                throw error;
            }

            throw new HttpException(
                'Failed to validate ticket',
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    @Post('check-in/:qrCode')
    @UseGuards(StaffAuthGuard)
    async checkInTicket(
        @Param('qrCode') qrCode: string,
        @Req() req: StaffAuthenticatedRequest & { ip?: string },
    ) {
        this.ensureRateLimit(`checkin:${req.staffSession?.id}:${req.ip}`, 10, 10_000);
        try {
            return await this.ticketsService.checkInTicket(qrCode, req.staffSession!);
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(
                'Failed to check in ticket',
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    @Get('event/:eventId/attendance')
    @UseGuards(StaffAuthGuard)
    async getEventAttendance(
        @Param('eventId') eventId: string,
        @Req() req: StaffAuthenticatedRequest,
    ) {
        try {
            return await this.ticketsService.getEventAttendance(eventId, req.staffSession!);
        } catch (error: unknown) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(
                'Failed to get attendance',
                HttpStatus.NOT_FOUND,
            );
        }
    }

    @Get('staff/events')
    @UseGuards(StaffAuthGuard)
    async getStaffEvents(@Req() req: StaffAuthenticatedRequest) {
        return this.ticketsService.getStaffEvents(req.staffSession!);
    }

    private ensureRateLimit(key: string, limit: number, ttlMs: number) {
        const allowed = this.rateLimit.consume(key, limit, ttlMs);
        if (!allowed) {
            throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
        }
    }
}
