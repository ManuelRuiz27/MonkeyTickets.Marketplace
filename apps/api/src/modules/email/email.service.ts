import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PdfGeneratorService } from '../tickets/pdf-generator.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly pdfGenerator: PdfGeneratorService,
        private readonly mailService: MailService,
    ) { }

    async sendTicketsEmail(orderId: string): Promise<void> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: true,
                event: true,
                tickets: true,
            },
        });

        if (!order) {
            throw new Error('Order not found');
        }

        if (!order.buyer?.email) {
            throw new Error('Order buyer has no email');
        }

        const pdfs = await this.pdfGenerator.generateOrderTickets(orderId);
        const subject = `Tus tickets para ${order.event.title}`;
        const htmlContent = this.buildTicketEmailTemplate(order);

        await this.mailService.sendTicketsEmail({
            orderId: order.id,
            to: order.buyer.email,
            subject,
            html: htmlContent,
            attachments: pdfs.map((pdf, idx) => ({
                filename: `ticket-${idx + 1}.pdf`,
                content: pdf,
            })),
        });

        this.logger.log(`Tickets enviados a ${order.buyer.email} para la orden ${orderId}`);
    }

    async resendTickets(orderId: string): Promise<void> {
        await this.sendTicketsEmail(orderId);
        this.logger.log(`Tickets reenviados para la orden ${orderId}`);
    }

    async sendPendingPaymentEmail(orderId: string): Promise<void> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: true,
                event: true,
            },
        });

        if (!order || !order.buyer?.email) {
            return;
        }

        const subject = `Instrucciones de pago - ${order.event.title}`;
        const htmlContent = this.buildPendingPaymentTemplate(order);

        await this.mailService.sendTicketsEmail({
            orderId: order.id,
            to: order.buyer.email,
            subject,
            html: htmlContent,
        });

        this.logger.log(`Email de pago pendiente enviado a ${order.buyer.email}`);
    }

    private buildTicketEmailTemplate(order: TicketEmailOrder): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2121aa; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MonoMarket</h1>
            <h2>Tus tickets están listos</h2>
        </div>
        <div class="content">
            <p>Hola <strong>${order.buyer.name ?? ''}</strong>,</p>
            <p>Tu compra fue confirmada. Adjuntamos tus tickets en PDF.</p>
            <h3>${order.event.title}</h3>
            <ul>
                <li><strong>Fecha:</strong> ${order.event.startDate ? new Date(order.event.startDate).toLocaleString('es-MX') : 'Por confirmar'}</li>
                <li><strong>Lugar:</strong> ${order.event.venue ?? 'Por confirmar'}</li>
                <li><strong>Número de tickets:</strong> ${order.tickets.length}</li>
            </ul>
            <p>Número de orden: <code>${order.id}</code></p>
        </div>
        <div class="footer">
            <p>MonoMarket - Sistema de Boletos</p>
            <p>Si tienes dudas, contacta al organizador.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }

    private buildPendingPaymentTemplate(order: PendingEmailOrder): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2121aa; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MonoMarket</h1>
            <h2>Instrucciones de Pago</h2>
        </div>
        <div class="content">
            <p>Hola <strong>${order.buyer.name ?? ''}</strong>,</p>
            <p>Tu orden está reservada. Para confirmarla comparte tu comprobante con el organizador y, en cuanto lo verifique, recibirás tus boletos en este correo.</p>
            <div class="alert">
                <strong>Importante:</strong> La reserva permanecerá activa hasta que confirmemos el pago o llegue su fecha de expiración.
            </div>
            <p>Número de orden: <code>${order.id}</code></p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }
}

type TicketEmailOrder = Prisma.OrderGetPayload<{
    include: {
        buyer: true;
        event: true;
        tickets: true;
    };
}>;

type PendingEmailOrder = Prisma.OrderGetPayload<{
    include: {
        buyer: true;
        event: true;
    };
}>;
