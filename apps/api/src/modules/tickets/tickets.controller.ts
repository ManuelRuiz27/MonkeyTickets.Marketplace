import { Controller, Get, Param, StreamableFile, Post, UseGuards, HttpException, HttpStatus, Req } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';


@Controller('tickets')
export class TicketsController {
    constructor(private readonly ticketsService: TicketsService) { }

    @Get(':id/pdf')
    async downloadPdf(@Param('id') id: string): Promise<StreamableFile> {
        const { stream, filename } = await this.ticketsService.generateTicketPdf(id);

        return new StreamableFile(stream, {
            type: 'application/pdf',
            disposition: `attachment; filename="${filename}"`,
        });
    }

    @Get('validate/:qrCode')
    @UseGuards(JwtAuthGuard)
    async validateTicket(@Param('qrCode') qrCode: string) {
        try {
            return await this.ticketsService.validateTicket(qrCode);
        } catch (error: any) {
            throw new HttpException(
                error.message || 'Failed to validate ticket',
                error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
            );
        }
    }

    @Post('check-in/:qrCode')
    @UseGuards(JwtAuthGuard)
    async checkInTicket(@Param('qrCode') qrCode: string) {
        try {
            return await this.ticketsService.checkInTicket(qrCode);
        } catch (error: any) {
            throw new HttpException(
                error.message || 'Failed to check in ticket',
                error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
            );
        }
    }

    @Get('event/:eventId/attendance')
    @UseGuards(JwtAuthGuard)
    async getEventAttendance(@Param('eventId') eventId: string) {
        try {
            return await this.ticketsService.getEventAttendance(eventId);
        } catch (error: any) {
            throw new HttpException(
                error.message || 'Failed to get attendance',
                error instanceof HttpException ? error.getStatus() : HttpStatus.NOT_FOUND
            );
        }
    }

    @Get('staff/events')
    @UseGuards(JwtAuthGuard)
    async getStaffEvents(@Req() req: Request & { user?: any }) {
        if (!req.user?.id) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        return this.ticketsService.getStaffEvents(req.user.id);
    }
}
