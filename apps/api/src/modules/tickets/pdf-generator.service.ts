import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as QRCode from 'qrcode';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

interface TicketQRPayload {
    ticketId: string;
    orderId: string;
    eventId: string;
    templateId: string;
    buyerEmail: string;
    iat: number;
    exp: number;
}

/**
 * Servicio para generación de PDFs de tickets (MVP Épica 3)
 * - Template por defecto
 * - Templates personalizados del organizador
 * - QR dinámico con JWT firmado
 * - Posicionamiento personalizado de QR
 */
@Injectable()
export class PdfGeneratorService {
    private readonly logger = new Logger(PdfGeneratorService.name);
    private readonly jwtSecret: string;
    private readonly baseUrl: string;

    constructor(private prisma: PrismaService) {
        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        this.baseUrl = process.env.API_URL || 'http://localhost:3000';
    }

    /**
     * Genera PDF de ticket con QR JWT
     */
    async generateTicketPdf(ticketId: string): Promise<Buffer> {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                order: {
                    include: {
                        buyer: true,
                        event: {
                            include: {
                                organizer: true,
                            },
                        },
                    },
                },
                template: true,
            },
        });

        if (!ticket) {
            throw new Error('Ticket no encontrado');
        }

        const event = ticket.order.event;
        const hasCustomTemplate = !!event.pdfTemplatePath;

        if (hasCustomTemplate) {
            return this.generateWithCustomTemplate(ticket);
        } else {
            return this.generateWithDefaultTemplate(ticket);
        }
    }

    /**
     * Genera PDF con template personalizado del organizador
     */
    private async generateWithCustomTemplate(ticket: any): Promise<Buffer> {
        const event = ticket.order.event;
        const templatePath = path.join(process.cwd(), event.pdfTemplatePath);

        try {
            // Cargar PDF template del organizador
            const existingPdfBytes = await fs.readFile(templatePath);
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];

            // Generar QR con JWT
            const qrBuffer = await this.generateQRCode(ticket);
            const qrImage = await pdfDoc.embedPng(qrBuffer);

            // Posición del QR (configurada por organizador)
            const qrX = event.qrCodeX || 50;
            const qrY = event.qrCodeY || 50;
            const qrWidth = event.qrCodeWidth || 100;

            firstPage.drawImage(qrImage, {
                x: qrX,
                y: qrY,
                width: qrWidth,
                height: qrWidth,
            });

            this.logger.log(`PDF generado con template custom para ticket ${ticket.id}`);
            return Buffer.from(await pdfDoc.save());
        } catch (error: any) {
            this.logger.error(`Error con template custom: ${error.message}`);
            // Fallback a template por defecto
            return this.generateWithDefaultTemplate(ticket);
        }
    }

    /**
     * Genera PDF con template por defecto de MonoMarket
     */
    private async generateWithDefaultTemplate(ticket: any): Promise<Buffer> {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]); // A4
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const event = ticket.order.event;
        const buyer = ticket.order.buyer;
        const template = ticket.template;

        // Colores
        const primaryColor = rgb(0.13, 0.13, 0.55); // Azul MonoMarket
        const textColor = rgb(0.2, 0.2, 0.2);

        // Header
        page.drawRectangle({
            x: 0,
            y: 742,
            width: 595,
            height: 100,
            color: primaryColor,
        });

        page.drawText('MONOMARKET', {
            x: 50,
            y: 790,
            size: 24,
            font: font,
            color: rgb(1, 1, 1),
        });

        // Título del evento
        page.drawText(event.title, {
            x: 50,
            y: 680,
            size: 20,
            font: font,
            color: textColor,
        });

        // Detalles del evento
        const details = [
            `Fecha: ${new Date(event.startDate).toLocaleDateString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })}`,
            `Lugar: ${event.venue || 'Por confirmar'}`,
            `Dirección: ${event.address || ''}`,
            ``,
            `Tipo de entrada: ${template.name}`,
            `Precio: $${Number(template.price).toFixed(2)} ${template.currency}`,
            ``,
            `Comprador: ${buyer.name}`,
            `Email: ${buyer.email}`,
            ``,
            `Orden: ${ticket.order.id}`,
            `Ticket ID: ${ticket.id}`,
        ];

        let yPos = 640;
        for (const detail of details) {
            page.drawText(detail, {
                x: 50,
                y: yPos,
                size: 11,
                font: fontRegular,
                color: textColor,
            });
            yPos -= 20;
        }

        // Generar y añadir QR Code
        const qrBuffer = await this.generateQRCode(ticket);
        const qrImage = await pdfDoc.embedPng(qrBuffer);

        page.drawImage(qrImage, {
            x: 350,
            y: 450,
            width: 150,
            height: 150,
        });

        page.drawText('Escanea en el evento', {
            x: 370,
            y: 430,
            size: 10,
            font: fontRegular,
            color: textColor,
        });

        // Footer
        page.drawText('MonoMarket - Sistema de Boletos', {
            x: 200,
            y: 50,
            size: 9,
            font: fontRegular,
            color: rgb(0.5, 0.5, 0.5),
        });

        page.drawText(`Generado: ${new Date().toLocaleDateString('es-MX')}`, {
            x: 220,
            y: 35,
            size: 8,
            font: fontRegular,
            color: rgb(0.5, 0.5, 0.5),
        });

        this.logger.log(`PDF generado con template default para ticket ${ticket.id}`);
        return Buffer.from(await pdfDoc.save());
    }

    /**
     * Genera QR Code con JWT firmado
     */
    private async generateQRCode(ticket: any): Promise<Buffer> {
        // Crear payload JWT
        const payload: TicketQRPayload = {
            ticketId: ticket.id,
            orderId: ticket.order.id,
            eventId: ticket.order.event.id,
            templateId: ticket.template.id,
            buyerEmail: ticket.order.buyer.email,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 año
        };

        // Firmar con JWT
        const token = jwt.sign(payload, this.jwtSecret, {
            algorithm: 'HS256',
        });

        // URL de verificación
        const verificationUrl = `${this.baseUrl}/api/tickets/verify/${token}`;

        // Generar QR como buffer PNG
        const qrBuffer = await QRCode.toBuffer(verificationUrl, {
            errorCorrectionLevel: 'H',
            type: 'png',
            width: 300,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
        });

        await this.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                qrJwtHash: this.hashToken(token),
            },
        });

        return qrBuffer;
    }

    /**
     * Verifica y decodifica JWT de QR
     */
    verifyTicketQR(token: string): TicketQRPayload {
        try {
            const decoded = jwt.verify(token, this.jwtSecret, {
                algorithms: ['HS256'],
                ignoreExpiration: true,
            }) as TicketQRPayload;

            return decoded;
        } catch (error: any) {
            this.logger.error(`Error verificando QR: ${error.message}`);
            throw new Error('QR inválido o expirado');
        }
    }

    /**
     * Genera múltiples PDFs para una orden
     */
    async generateOrderTickets(orderId: string): Promise<Buffer[]> {
        const tickets = await this.prisma.ticket.findMany({
            where: { orderId },
            include: {
                order: {
                    include: {
                        buyer: true,
                        event: {
                            include: {
                                organizer: true,
                            },
                        },
                    },
                },
                template: true,
            },
        });

        const pdfs: Buffer[] = [];
        for (const ticket of tickets) {
            const pdf = await this.generateTicketPdf(ticket.id);
            pdfs.push(pdf);
        }

        this.logger.log(`${pdfs.length} PDFs generados para orden ${orderId}`);
        return pdfs;
    }

    private hashToken(token: string) {
        return createHash('sha256').update(token).digest('hex');
    }
}
