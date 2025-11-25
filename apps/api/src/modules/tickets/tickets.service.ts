import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { Readable } from 'stream';
import { PDFDocument as PDFLib } from 'pdf-lib';
import * as fs from 'fs/promises';

@Injectable()
export class TicketsService {
    constructor(private prisma: PrismaService) { }

    async generateTicketPdf(ticketId: string): Promise<{ stream: Readable; filename: string }> {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                order: {
                    include: {
                        event: true,
                        buyer: true,
                    },
                },
                template: true,
            },
        });

        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        // Check if event has custom PDF template
        if (ticket.order.event.pdfTemplatePath) {
            return this.generateFromTemplate(ticket);
        } else {
            return this.generateDefaultPdf(ticket);
        }
    }

    private async generateFromTemplate(ticket: any): Promise<{ stream: Readable; filename: string }> {
        const event = ticket.order.event;
        const templatePath = event.pdfTemplatePath;

        // Generate QR code as PNG buffer
        const qrCodeBuffer = await QRCode.toBuffer(ticket.qrCode, {
            type: 'png',
            width: event.qrCodeWidth || 150,
            margin: 1,
        });

        // Determine file type from extension
        const ext = templatePath.split('.').pop()?.toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png'].includes(ext || '');

        if (isImage) {
            // Image template: create PDF from image and overlay QR
            return this.generateFromImageTemplate(ticket, templatePath, qrCodeBuffer);
        } else {
            // PDF template: load and overlay QR
            return this.generateFromPdfTemplate(ticket, templatePath, qrCodeBuffer);
        }
    }

    private async generateFromPdfTemplate(
        ticket: any,
        templatePath: string,
        qrCodeBuffer: Buffer
    ): Promise<{ stream: Readable; filename: string }> {
        const event = ticket.order.event;

        // Load custom template PDF
        const templateBytes = await fs.readFile(templatePath);
        const pdfDoc = await PDFLib.load(templateBytes);

        // Embed QR code image
        const qrImage = await pdfDoc.embedPng(qrCodeBuffer);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];

        // Draw QR code at specified coordinates
        firstPage.drawImage(qrImage, {
            x: event.qrCodeX || 400,
            y: event.qrCodeY || 100,
            width: event.qrCodeWidth || 150,
            height: event.qrCodeWidth || 150,
        });

        // Save modified PDF
        const pdfBytes = await pdfDoc.save();

        // Create readable stream
        const stream = new Readable();
        stream.push(Buffer.from(pdfBytes));
        stream.push(null);

        return {
            stream,
            filename: `ticket-${ticket.qrCode}.pdf`,
        };
    }

    private async generateFromImageTemplate(
        ticket: any,
        imagePath: string,
        qrCodeBuffer: Buffer
    ): Promise<{ stream: Readable; filename: string }> {
        const event = ticket.order.event;

        // Create new PDF document
        const pdfDoc = await PDFLib.create();

        // Read image file
        const imageBytes = await fs.readFile(imagePath);
        const ext = imagePath.split('.').pop()?.toLowerCase();

        // Embed image
        let backgroundImage;
        if (ext === 'png') {
            backgroundImage = await pdfDoc.embedPng(imageBytes);
        } else {
            backgroundImage = await pdfDoc.embedJpg(imageBytes);
        }

        // Get image dimensions and create page with same size
        const { width: imgWidth, height: imgHeight } = backgroundImage;
        const page = pdfDoc.addPage([imgWidth, imgHeight]);

        // Draw background image
        page.drawImage(backgroundImage, {
            x: 0,
            y: 0,
            width: imgWidth,
            height: imgHeight,
        });

        // Embed QR code
        const qrImage = await pdfDoc.embedPng(qrCodeBuffer);

        // Calculate QR position (scale from A4 to actual image size)
        const scaleX = imgWidth / 595;
        const scaleY = imgHeight / 842;

        const qrX = (event.qrCodeX || 400) * scaleX;
        const qrY = (event.qrCodeY || 100) * scaleY;
        const qrSize = (event.qrCodeWidth || 150) * Math.min(scaleX, scaleY);

        // Draw QR code
        page.drawImage(qrImage, {
            x: qrX,
            y: qrY,
            width: qrSize,
            height: qrSize,
        });

        // Save PDF
        const pdfBytes = await pdfDoc.save();

        // Create readable stream
        const stream = new Readable();
        stream.push(Buffer.from(pdfBytes));
        stream.push(null);

        return {
            stream,
            filename: `ticket-${ticket.qrCode}.pdf`,
        };
    }

    private async generateDefaultPdf(ticket: any): Promise<{ stream: Readable; filename: string }> {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = new Readable();
        stream._read = () => { }; // _read is required but we can noop it

        // Pipe the PDF into our readable stream
        doc.on('data', (chunk) => stream.push(chunk));
        doc.on('end', () => stream.push(null));

        // Generate QR Code
        const qrCodeDataUrl = await QRCode.toDataURL(ticket.qrCode);

        // --- PDF Design ---

        // Header / Event Title
        doc.fontSize(24).font('Helvetica-Bold').text(ticket.order.event.title, { align: 'center' });
        doc.moveDown(0.5);

        // Ticket Details Box
        doc.rect(50, 150, 495, 250).stroke();

        // QR Code
        doc.image(qrCodeDataUrl, 380, 170, { width: 150 });

        // Info Text
        doc.fontSize(12).font('Helvetica');

        const startY = 170;
        const lineHeight = 20;
        let currentY = startY;

        // Attendee Name
        doc.font('Helvetica-Bold').text('Asistente:', 70, currentY);
        doc.font('Helvetica').text(ticket.order.buyer.name, 150, currentY);
        currentY += lineHeight;

        // Ticket Type
        doc.font('Helvetica-Bold').text('Tipo:', 70, currentY);
        doc.font('Helvetica').text(ticket.template.name, 150, currentY);
        currentY += lineHeight;

        // Date
        doc.font('Helvetica-Bold').text('Fecha:', 70, currentY);
        doc.font('Helvetica').text(ticket.order.event.startDate.toLocaleString(), 150, currentY);
        currentY += lineHeight;

        // Venue
        doc.font('Helvetica-Bold').text('Lugar:', 70, currentY);
        doc.font('Helvetica').text(ticket.order.event.venue || 'N/A', 150, currentY);
        currentY += lineHeight;

        // Address
        doc.font('Helvetica-Bold').text('Dirección:', 70, currentY);
        doc.font('Helvetica').text(`${ticket.order.event.address}, ${ticket.order.event.city}`, 150, currentY, { width: 200 });

        // Ticket ID
        doc.fontSize(10).text(`ID: ${ticket.qrCode}`, 70, 380);

        // Footer
        doc.fontSize(10).text('Presenta este boleto en la entrada.', 50, 420, { align: 'center' });
        doc.fillColor('gray').text('MonoMarket Tickets', 50, 750, { align: 'center' });

        doc.end();

        return {
            stream,
            filename: `ticket-${ticket.qrCode}.pdf`
        };
    }

    /**
     * Validate a ticket by QR code without checking it in
     */
    async validateTicket(qrCode: string) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { qrCode },
            include: {
                order: {
                    include: {
                        event: {
                            select: {
                                id: true,
                                title: true,
                                startDate: true,
                                venue: true,
                                address: true,
                                city: true,
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
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        return {
            id: ticket.id,
            qrCode: ticket.qrCode,
            status: ticket.status,
            usedAt: ticket.usedAt,
            event: ticket.order.event,
            buyer: ticket.order.buyer,
            template: ticket.template,
            orderStatus: ticket.order.status,
        };
    }

    /**
     * Check in a ticket (mark as USED)
     */
    async checkInTicket(qrCode: string) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { qrCode },
            include: {
                order: {
                    include: {
                        event: true,
                    },
                },
            },
        });

        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }

        // Validate ticket can be checked in
        if (ticket.status === 'USED') {
            throw new Error(`Ticket already used at ${ticket.usedAt?.toISOString()}`);
        }

        if (ticket.status === 'CANCELLED') {
            throw new Error('Ticket has been cancelled');
        }

        if (ticket.order.status !== 'PAID') {
            throw new Error('Order is not paid');
        }

        // Update ticket status and increment attendance count
        const [updatedTicket] = await this.prisma.$transaction([
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
                        select: {
                            name: true,
                        },
                    },
                },
            }),
            this.prisma.event.update({
                where: { id: ticket.order.eventId },
                data: {
                    attendanceCount: {
                        increment: 1,
                    },
                },
            }),
        ]);

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
            event: updatedTicket.order.event,
        };
    }

    /**
     * Get attendance stats for an event
     */
    async getEventAttendance(eventId: string) {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                title: true,
                attendanceCount: true,
                _count: {
                    select: {
                        orders: true,
                    },
                },
            },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        // Get total tickets sold
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

    async getStaffEvents(userId: string) {
        return this.prisma.event.findMany({
            where: {
                staff: {
                    some: { userId },
                },
            },
            select: {
                id: true,
                title: true,
                startDate: true,
                venue: true,
                address: true,
                city: true,
            },
            orderBy: { startDate: 'asc' },
        });
    }
}
