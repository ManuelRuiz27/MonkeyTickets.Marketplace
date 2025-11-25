import { Injectable, Logger } from '@nestjs/common';
import { EmailStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const IS_SMTP_CONFIGURED = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);

interface OrderSummary {
    id: string;
    event: { title: string };
    buyer: { email: string; name: string };
}

interface TicketSummary {
    id: string;
    qrCode: string;
    pdfUrl?: string | null;
}

export interface SendTicketsEmailParams {
    orderId?: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: { filename: string; path: string }[];
}

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    constructor(private readonly prisma: PrismaService) { }

    async sendTicketsEmail(params: SendTicketsEmailParams): Promise<void> {
        // TODO: integrate SMTP provider using SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
        if (!IS_SMTP_CONFIGURED) {
            this.logger.warn('SMTP credentials are not fully configured; skipping real email sending.');
        }
        this.logger.log('MailService.sendTicketsEmail called', {
            orderId: params.orderId,
            to: params.to,
            subject: params.subject,
            attachments: params.attachments?.length ?? 0,
        });

        try {
            await this.prisma.emailLog.create({
                data: {
                    orderId: params.orderId,
                    to: params.to,
                    subject: params.subject,
                    status: EmailStatus.SENT,
                    sentAt: new Date(),
                },
            });
        } catch (error) {
            this.logger.warn(`Email log persistence failed: ${(error as Error).message}`);
        }
    }

    async sendOrderConfirmation(order: OrderSummary, tickets: TicketSummary[]): Promise<void> {
        await this.sendTicketsEmail({
            orderId: order.id,
            to: order.buyer.email,
            subject: `Tus boletos para ${order.event.title}`,
            text: `Hola ${order.buyer.name}, adjuntamos ${tickets.length} boletos.`,
        });
    }
}
