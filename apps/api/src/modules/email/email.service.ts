import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfGeneratorService } from '../tickets/pdf-generator.service';
import { MailService } from '../mail/mail.service';

/**
 * Servicio de email de alto nivel
 * Orquesta la generación de PDFs y delega el envío real a MailService.
 */
@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly fromEmail: string;
    private readonly fromName: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly pdfGenerator: PdfGeneratorService,
        private readonly mailService: MailService,
    ) {
        this.fromEmail = process.env.EMAIL_FROM || 'tickets@monomarket.mx';
        this.fromName = process.env.EMAIL_FROM_NAME || 'MonoMarket';
    }

    /**
     * Envía tickets por email después de pago exitoso
     */
    async sendTicketsEmail(orderId: string): Promise<void> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: true,
                event: {
                    include: {
                        organizer: true,
                    },
                },
                tickets: true,
            },
        });

        if (!order) {
            throw new Error('Orden no encontrada');
        }

        // Generar PDFs de los tickets
        const pdfs = await this.pdfGenerator.generateOrderTickets(orderId);

        const subject = `🎟️ Tus tickets para ${order.event.title}`;
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

        this.logger.log(`Tickets enviados (via MailService) a ${order.buyer.email} para orden ${orderId}`);
    }

    /**
     * Reenvía tickets de una orden
     */
    async resendTickets(orderId: string): Promise<void> {
        await this.sendTicketsEmail(orderId);
        this.logger.log(`Tickets reenviados para orden ${orderId}`);
    }

    /**
     * Envía confirmación de orden pendiente (OXXO/SPEI)
     */
    async sendPendingPaymentEmail(orderId: string, paymentDetails: any): Promise<void> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: true,
                event: true,
            },
        });

        if (!order) return;

        const subject = `🧾 Instrucciones de pago - ${order.event.title}`;
        const htmlContent = this.buildPendingPaymentTemplate(order, paymentDetails);

        await this.mailService.sendTicketsEmail({
            orderId: order.id,
            to: order.buyer.email,
            subject,
            html: htmlContent,
        });

        this.logger.log(`Email de pago pendiente enviado (via MailService) a ${order.buyer.email}`);
    }

    /**
     * Template HTML para email de tickets
     */
    private buildTicketEmailTemplate(order: any): string {
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
        .button { display: inline-block; padding: 12px 24px; background: #2121aa; color: white; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MonoMarket</h1>
            <h2>¡Tus tickets están listos!</h2>
        </div>
        <div class="content">
            <p>Hola <strong>${order.buyer.name}</strong>,</p>
            
            <p>Tu compra ha sido confirmada. Aquí están los detalles:</p>
            
            <h3>${order.event.title}</h3>
            <ul>
                <li><strong>Fecha:</strong> ${new Date(order.event.startDate).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
                <li><strong>Lugar:</strong> ${order.event.venue || 'Por confirmar'}</li>
                <li><strong>Número de tickets:</strong> ${order.tickets.length}</li>
                <li><strong>Total pagado:</strong> $${Number(order.total).toFixed(2)} ${order.currency}</li>
            </ul>
            
            <p><strong>Tus tickets están adjuntos en PDF.</strong> Presenta el código QR en el evento para ingresar.</p>
            
            <p>Número de orden: <code>${order.id}</code></p>
            
            <p style="margin-top: 30px;">
                ¡Nos vemos en el evento!
            </p>
        </div>
        <div class="footer">
            <p>MonoMarket - Sistema de Boletos</p>
            <p>Si tienes alguna duda, contacta al organizador.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }

    /**
     * Template para pago pendiente (OXXO/SPEI)
     */
    private buildPendingPaymentTemplate(order: any, paymentDetails: any): string {
        const isOxxo = paymentDetails.type === 'store';
        const isSpei = paymentDetails.type === 'bank_transfer';

        let paymentInstructions = '';
        if (isOxxo) {
            paymentInstructions = `
                <h3>Pagar en OXXO</h3>
                <p><strong>Referencia:</strong> <code style="font-size: 18px;">${paymentDetails.reference}</code></p>
                <p><strong>Monto:</strong> $${Number(order.total).toFixed(2)} ${order.currency}</p>
                <p><strong>Válido hasta:</strong> ${paymentDetails.expiresAt}</p>
                <p>1. Acude a cualquier tienda OXXO<br>
                2. Indica que harás un pago de servicio OXXOPay<br>
                3. Proporciona la referencia al cajero<br>
                4. Realiza el pago en efectivo<br>
                5. Recibirás tus tickets por email automáticamente</p>
            `;
        } else if (isSpei) {
            paymentInstructions = `
                <h3>Transferencia SPEI</h3>
                <p><strong>CLABE:</strong> <code style="font-size: 16px;">${paymentDetails.clabe}</code></p>
                <p><strong>Banco:</strong> ${paymentDetails.bank}</p>
                <p><strong>Monto exacto:</strong> $${Number(order.total).toFixed(2)} ${order.currency}</p>
                <p>Realiza la transferencia desde tu banco y recibirás tus tickets automáticamente.</p>
            `;
        }

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
            <p>Hola <strong>${order.buyer.name}</strong>,</p>
            
            <p>Tu orden ha sido creada exitosamente. Para confirmarla y recibir tus tickets:</p>
            
            ${paymentInstructions}
            
            <div class="alert">
                <strong>Importante:</strong> Una vez realizado el pago, recibirás tus tickets automáticamente en este correo.
            </div>
            
            <p>Número de orden: <code>${order.id}</code></p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }
}

