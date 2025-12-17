import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Res,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { RPTicketsService, GenerateRPTicketDto } from './rp-tickets.service';

@Controller('rp')
export class RPTicketsController {
    constructor(private readonly rpTicketsService: RPTicketsService) { }

    /**
     * Generar boleto desde RP (público, sin autenticación)
     */
    @Post(':rpCode/generate-ticket')
    async generateTicket(
        @Param('rpCode') rpCode: string,
        @Body() generateTicketDto: GenerateRPTicketDto,
        @Res() res: Response,
    ) {
        const result = await this.rpTicketsService.generateRPTicket(
            rpCode,
            generateTicketDto,
        );

        // Enviar PDF como respuesta
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="ticket-${result.ticket.id}.pdf"`,
        );
        res.status(HttpStatus.OK).send(result.pdfBuffer);
    }

    /**
     * Obtener lista de boletos generados por un RP
     */
    @Get(':rpCode/tickets')
    async getTickets(@Param('rpCode') rpCode: string) {
        return this.rpTicketsService.getRPTickets(rpCode);
    }
}
