import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { Readable } from 'stream';
import { ActiveStaffSession } from '../staff/staff.types';
import { createHash } from 'crypto';

type TicketStatusResponse =
    | 'VALID'
    | 'USED'
    | 'CANCELLED'
    | 'UNPAID'
    | 'EXPIRED'
    | 'RESERVED';

@Injectable()
export class TicketsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly pdfGenerator: PdfGeneratorService,
    ) { }

    async generateTicketPdf(ticketId: string): Promise<{ stream: Readable; filename: string }> {
        const pdfBuffer = await this.pdfGenerator.generateTicketPdf(ticketId);
        const stream = new Readable();
        stream.push(pdfBuffer);
        stream.push(null);

        return {
            stream,
            filename: `ticket-${ticketId}.pdf`,
        };
    }

    async verifyTicketToken(token: string, session: ActiveStaffSession) {
        const payload = this.pdfGenerator.verifyTicketQR(token);
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: payload.ticketId },
            include: {
                template: {
                    select: { name: true },
                },
                order: {
                    include: {
                        event: true,
                        buyer: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        if (ticket.order.eventId !== session.eventId) {
            throw new ForbiddenException('Ticket does not belong to this event');
        }

        const hashed = this.hashToken(token);
        if (ticket.qrJwtHash && ticket.qrJwtHash !== hashed) {
            throw new BadRequestException('QR token does not match current ticket');
        }

        if (!ticket.qrJwtHash) {
            await this.prisma.ticket.update({
                where: { id: ticket.id },
                data: { qrJwtHash: hashed },
            });
        }

        const status = this.computeTicketStatus(ticket, payload.exp);

        return {
            ticket: {
                id: ticket.id,
                qrCode: ticket.qrCode,
                status,
                usedAt: ticket.usedAt,
                template: ticket.template,
            },
            buyer: ticket.order.buyer,
            event: {
                id: ticket.order.event.id,
                title: ticket.order.event.title,
                startDate: ticket.order.event.startDate,
                venue: ticket.order.event.venue,
            },
            orderStatus: ticket.order.status,
            reservedUntil: ticket.order.reservedUntil,
        };
    }

    async checkInTicket(qrCode: string, session: ActiveStaffSession) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { qrCode },
            include: {
                order: {
                    include: {
                        event: true,
                        buyer: {
                            select: { name: true, email: true },
                        },
                    },
                },
                template: {
                    select: { name: true },
                },
                rp: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });

        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        if (ticket.order.eventId !== session.eventId) {
            throw new ForbiddenException('Ticket does not belong to this event');
        }

        if (ticket.status === 'USED') {
            throw new BadRequestException(`Ticket already used at ${ticket.usedAt?.toISOString()}`);
        }

        if (ticket.status === 'CANCELLED') {
            throw new BadRequestException('Ticket has been cancelled');
        }

        if (ticket.order.status !== 'PAID') {
            throw new BadRequestException('Order is not paid');
        }

        // Enforzar ventana temporal de validación basada en fechas del evento
        const now = Date.now();
        const event = ticket.order.event;
        const startMs = event.startDate ? new Date(event.startDate).getTime() : undefined;
        const endMs = event.endDate ? new Date(event.endDate).getTime() : undefined;

        const ONE_HOUR_MS = 60 * 60 * 1000;
        const ONE_DAY_MS = 24 * ONE_HOUR_MS;
        const NINETY_DAYS_MS = 90 * ONE_DAY_MS;

        let expiresAt: number;

        if (typeof endMs === 'number' && !Number.isNaN(endMs)) {
            expiresAt = endMs + 12 * ONE_HOUR_MS;
        } else if (typeof startMs === 'number' && !Number.isNaN(startMs)) {
            expiresAt = startMs + 24 * ONE_HOUR_MS;
        } else {
            // Fallback coherente con computeTicketStatus: 90 días desde ahora.
            expiresAt = now + NINETY_DAYS_MS;
        }

        if (expiresAt <= now) {
            throw new BadRequestException('Ticket expired for this event');
        }

        // Transaction atómica: actualizar ticket, event y RP si existe
        const updates = [
            this.prisma.ticket.update({
                where: { id: ticket.id },
                data: {
                    status: 'USED',
                    usedAt: new Date(),
                },
                include: {
                    order: {
                        include: {
                            event: {
                                select: {
                                    id: true,
                                    title: true,
                                    attendanceCount: true,
                                },
                            },
                            buyer: {
                                select: {
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    template: {
                        select: { name: true },
                    },
                    rp: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
            }),
            this.prisma.event.update({
                where: { id: ticket.order.eventId },
                data: {
                    attendanceCount: { increment: 1 },
                },
            }),
        ];

        // Si el ticket fue generado por un RP, incrementar su contador
        if (ticket.rpId) {
            updates.push(
                this.prisma.rP.update({
                    where: { id: ticket.rpId },
                    data: {
                        ticketsUsed: { increment: 1 },
                    },
                }),
            );
        }

        const [updatedTicket, updatedEvent] = await this.prisma.$transaction(updates);

        return {
            success: true,
            ticket: {
                id: updatedTicket.id,
                qrCode: updatedTicket.qrCode,
                status: updatedTicket.status,
                usedAt: updatedTicket.usedAt,
                buyer: updatedTicket.order.buyer,
                template: updatedTicket.template,
            },
            event: {
                id: updatedEvent.id,
                attendanceCount: updatedEvent.attendanceCount,
                title: updatedTicket.order.event.title,
            },
            rp: ticket.rp || null, // Información del RP si existe
        };
    }

    async getEventAttendance(eventId: string, session: ActiveStaffSession) {
        if (session.eventId !== eventId) {
            throw new ForbiddenException('Access denied for this event');
        }

        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                title: true,
                attendanceCount: true,
            },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        const totalTickets = await this.prisma.ticket.count({
            where: {
                order: {
                    eventId,
                    status: 'PAID',
                },
            },
        });

        return {
            eventId: event.id,
            eventTitle: event.title,
            attendanceCount: event.attendanceCount,
            totalTickets,
            percentageAttended: totalTickets > 0 ? (event.attendanceCount / totalTickets) * 100 : 0,
        };
    }

    async getStaffEvents(session: ActiveStaffSession) {
        return [
            {
                id: session.event.id,
                title: session.event.title,
                startDate: session.event.startDate,
                venue: session.event.venue,
            },
        ];
    }

    private computeTicketStatus(ticket: any, tokenExpSeconds: number): TicketStatusResponse {
        if (ticket.status === 'USED') {
            return 'USED';
        }

        if (ticket.status === 'CANCELLED') {
            return 'CANCELLED';
        }

        if (ticket.order.status !== 'PAID') {
            return ticket.order.reservedUntil && ticket.order.reservedUntil > new Date()
                ? 'RESERVED'
                : 'UNPAID';
        }

        const now = Date.now();

        const ONE_HOUR_MS = 60 * 60 * 1000;
        const ONE_DAY_MS = 24 * ONE_HOUR_MS;
        const NINETY_DAYS_MS = 90 * ONE_DAY_MS;

        const event = ticket.order?.event;
        const startMs = event?.startDate ? new Date(event.startDate).getTime() : undefined;
        const endMs = event?.endDate ? new Date(event.endDate).getTime() : undefined;

        let expiresAt: number;

        // Regla principal de negocio:
        // - Si hay endDate: QR válido hasta 12h después del fin del evento.
        // - Si solo hay startDate: QR válido hasta 24h después del inicio.
        if (typeof endMs === 'number' && !Number.isNaN(endMs)) {
            expiresAt = endMs + 12 * ONE_HOUR_MS;
        } else if (typeof startMs === 'number' && !Number.isNaN(startMs)) {
            expiresAt = startMs + 24 * ONE_HOUR_MS;
        } else if (tokenExpSeconds) {
            // Fallback: usar exp del token si viene definido.
            expiresAt = tokenExpSeconds * 1000;
        } else {
            // Fallback final: si no hubo fechas ni exp, asumir 90 días desde ahora.
            expiresAt = now + NINETY_DAYS_MS;
        }

        if (expiresAt <= now) {
            return 'EXPIRED';
        }

        return 'VALID';
    }

    private hashToken(token: string) {
        return createHash('sha256').update(token).digest('hex');
    }
}
