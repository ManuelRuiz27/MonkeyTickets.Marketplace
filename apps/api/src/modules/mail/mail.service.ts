import { Injectable, Logger } from '@nestjs/common';
import { EmailStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const IS_SMTP_CONFIGURED = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);

const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM || SMTP_USER || 'no-reply@monomarket.mx';
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME || 'MonoMarket';

export interface SendTicketsEmailParams {
    orderId?: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: { filename: string; path?: string; content?: Buffer }[];
}

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: nodemailer.Transporter | null;

    constructor(private readonly prisma: PrismaService) {
        if (IS_SMTP_CONFIGURED) {
            const port = Number(SMTP_PORT);
            this.transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: isNaN(port) ? 587 : port,
                secure: port === 465,
                auth: {
                    user: SMTP_USER,
                    pass: SMTP_PASS,
                },
            });
            this.logger.log('SMTP transport configured for MailService');
        } else {
            this.transporter = null;
            this.logger.warn('SMTP credentials are not fully configured; MailService will not send real emails.');
        }
    }

    async sendTicketsEmail(params: SendTicketsEmailParams): Promise<void> {
        this.logger.log('MailService.sendTicketsEmail invoked', {
            orderId: params.orderId,
            to: params.to,
            subject: params.subject,
            attachments: params.attachments?.length ?? 0,
        });

        let status: EmailStatus = EmailStatus.PENDING;
        let providerMessageId: string | undefined;

        if (this.transporter && IS_SMTP_CONFIGURED) {
            try {
                const from = `"${DEFAULT_FROM_NAME}" <${DEFAULT_FROM_EMAIL}>`;
                const info = await this.transporter.sendMail({
                    from,
                    to: params.to,
                    subject: params.subject,
                    text: params.text,
                    html: params.html,
                    attachments: params.attachments?.map((attachment) => ({
                        filename: attachment.filename,
                        path: attachment.path,
                        content: attachment.content,
                    })),
                });
                status = EmailStatus.SENT;
                providerMessageId = info.messageId;
                this.logger.log(`Email sent via SMTP to ${params.to} (messageId=${info.messageId})`);
            } catch (error: unknown) {
                status = EmailStatus.FAILED;
                const message = error instanceof Error ? error.message : String(error);
                const stack = error instanceof Error ? error.stack : undefined;
                this.logger.error(`Failed to send email via SMTP: ${message}`, stack);
            }
        } else {
            this.logger.warn('SMTP not configured; skipping real email sending and logging as PENDING.');
            status = EmailStatus.PENDING;
        }

        try {
            await this.prisma.emailLog.create({
                data: {
                    orderId: params.orderId,
                    to: params.to,
                    subject: params.subject,
                    status,
                    providerMessageId,
                    sentAt: status === EmailStatus.SENT ? new Date() : null,
                },
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Email log persistence failed: ${message}`);
        }
    }
}
