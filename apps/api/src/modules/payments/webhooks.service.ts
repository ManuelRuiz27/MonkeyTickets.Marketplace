import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

/**
 * Servicio para manejar webhooks de payment gateways (MVP Épica 2 & 6)
 * - OpenPay webhooks
 * - MercadoPago webhooks
 * - Signature verification
 * - Audit logging en WebhookLog table
 * - Email automático de tickets
 */
@Injectable()
export class PaymentsWebhooksService {
    private readonly logger = new Logger(PaymentsWebhooksService.name);

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
    ) { }

    /**
     * Procesa webhook de OpenPay
     */
    async handleOpenpayWebhook(payload: any, signature?: string): Promise<void> {
        const eventType = payload.type || 'unknown';
        const chargeId = payload.transaction?.id;

        // Verificar firma si existe
        const verified = signature ? this.verifyOpenpaySignature(payload, signature) : false;

        // Log webhook en BD (MVP compliance)
        await this.logWebhook({
            gateway: 'openpay',
            event: eventType,
            payload,
            signature,
            verified,
            orderId: payload.transaction?.order_id,
        });

        if (!verified && signature) {
            this.logger.warn(`Webhook OpenPay con firma inválida: ${chargeId}`);
            throw new BadRequestException('Firma inválida');
        }

        this.logger.log(`Webhook OpenPay recibido: ${eventType} - ${chargeId}`);

        // Procesar según tipo de evento
        switch (eventType) {
            case 'charge.succeeded':
                await this.handleChargeSucceeded(payload);
                break;
            case 'charge.failed':
                await this.handleChargeFailed(payload);
                break;
            case 'charge.cancelled':
                await this.handleChargeCancelled(payload);
                break;
            case 'charge.refunded':
                await this.handleChargeRefunded(payload);
                break;
            default:
                this.logger.debug(`Evento OpenPay no manejado: ${eventType}`);
        }
    }

    /**
     * Procesa webhook de MercadoPago
     */
    async handleMercadopagoWebhook(payload: any, signature?: string): Promise<void> {
        const eventType = payload.type || payload.action || 'unknown';
        const paymentId = payload.data?.id;

        // Log webhook
        await this.logWebhook({
            gateway: 'mercadopago',
            event: eventType,
            payload,
            signature,
            verified: false, // MercadoPago usa otro método de verificación
            orderId: payload.external_reference,
        });

        this.logger.log(`Webhook MercadoPago recibido: ${eventType} - ${paymentId}`);

        // Procesar según tipo
        if (eventType === 'payment') {
            const paymentStatus = payload.data?.status;
            if (paymentStatus === 'approved') {
                await this.handlePaymentApproved(payload);
            }
        }
    }

    /**
     * Maneja cargo exitoso
     */
    private async handleChargeSucceeded(payload: any): Promise<void> {
        const orderId = payload.transaction?.order_id;
        if (!orderId) return;

        try {
            await this.prisma.$transaction(async (tx) => {
                // Actualizar orden
                await tx.order.update({
                    where: { id: orderId },
                    data: {
                        status: 'PAID',
                        paidAt: new Date(),
                    },
                });

                // Actualizar payment
                await tx.payment.updateMany({
                    where: { orderId },
                    data: {
                        status: 'COMPLETED',
                        gatewayTransactionId: payload.transaction?.id,
                    },
                });

                // Generar tickets
                const order = await tx.order.findUnique({
                    where: { id: orderId },
                    include: { items: true },
                });

                if (order) {
                    for (const item of order.items) {
                        for (let i = 0; i < item.quantity; i++) {
                            const qrCode = this.generateUniqueQR();
                            await tx.ticket.create({
                                data: {
                                    orderId: order.id,
                                    templateId: item.templateId,
                                    qrCode,
                                    status: 'VALID',
                                },
                            });
                        }

                        // Actualizar sold count del template
                        await tx.ticketTemplate.update({
                            where: { id: item.templateId },
                            data: {
                                sold: {
                                    increment: item.quantity,
                                },
                            },
                        });
                    }
                }
            });

            this.logger.log(`Orden ${orderId} marcada como PAID y tickets generados`);

            // MVP: Enviar tickets por email automáticamente
            try {
                await this.emailService.sendTicketsEmail(orderId);
            } catch (emailError: any) {
                this.logger.error(`Error enviando tickets por email: ${emailError.message}`);
                // No lanzar error, ya que el pago está completo
            }
        } catch (error: any) {
            this.logger.error(`Error procesando charge.succeeded: ${error.message}`);
        }
    }

    /**
     * Maneja cargo fallido
     */
    private async handleChargeFailed(payload: any): Promise<void> {
        const orderId = payload.transaction?.order_id;
        if (!orderId) return;

        try {
            await this.prisma.order.update({
                where: { id: orderId },
                data: { status: 'CANCELLED' },
            });

            await this.prisma.payment.updateMany({
                where: { orderId },
                data: { status: 'FAILED' },
            });

            this.logger.log(`Orden ${orderId} marcada como CANCELLED por pago fallido`);
        } catch (error: any) {
            this.logger.error(`Error en charge.failed: ${error.message}`);
        }
    }

    /**
     * Maneja cargo cancelado
     */
    private async handleChargeCancelled(payload: any): Promise<void> {
        const orderId = payload.transaction?.order_id;
        if (!orderId) return;

        try {
            await this.prisma.order.update({
                where: { id: orderId },
                data: { status: 'CANCELLED' },
            });

            this.logger.log(`Orden ${orderId} cancelada`);
        } catch (error: any) {
            this.logger.error(`Error en charge.cancelled: ${error.message}`);
        }
    }

    /**
     * Maneja reembolso
     */
    private async handleChargeRefunded(payload: any): Promise<void> {
        const orderId = payload.transaction?.order_id;
        if (!orderId) return;

        try {
            await this.prisma.order.update({
                where: { id: orderId },
                data: { status: 'REFUNDED' },
            });

            // Invalidar tickets
            await this.prisma.ticket.updateMany({
                where: { orderId },
                data: { status: 'CANCELLED' },
            });

            this.logger.log(`Orden ${orderId} reembolsada y tickets cancelados`);
        } catch (error: any) {
            this.logger.error(`Error en charge.refunded: ${error.message}`);
        }
    }

    /**
     * Maneja pago aprobado de MercadoPago
     */
    private async handlePaymentApproved(payload: any): Promise<void> {
        const orderId = payload.external_reference;
        if (!orderId) return;

        this.logger.log(`Pago MercadoPago aprobado para orden ${orderId}`);

        try {
            await this.prisma.$transaction(async (tx) => {
                // 1. Actualizar orden
                await tx.order.update({
                    where: { id: orderId },
                    data: {
                        status: 'PAID',
                        paidAt: new Date(),
                    },
                });

                // 2. Actualizar payment
                await tx.payment.updateMany({
                    where: { orderId },
                    data: {
                        status: 'COMPLETED',
                        gatewayTransactionId: String(payload.data?.id),
                    },
                });

                // 3. Generar tickets
                const order = await tx.order.findUnique({
                    where: { id: orderId },
                    include: { items: true },
                });

                if (order) {
                    for (const item of order.items) {
                        for (let i = 0; i < item.quantity; i++) {
                            const qrCode = this.generateUniqueQR();
                            await tx.ticket.create({
                                data: {
                                    orderId: order.id,
                                    templateId: item.templateId,
                                    qrCode,
                                    status: 'VALID',
                                },
                            });
                        }

                        // Actualizar sold count del template
                        await tx.ticketTemplate.update({
                            where: { id: item.templateId },
                            data: {
                                sold: {
                                    increment: item.quantity,
                                },
                            },
                        });
                    }
                }
            });

            this.logger.log(`Orden ${orderId} marcada como PAID y tickets generados (MercadoPago)`);

            // 4. Enviar tickets por email
            try {
                await this.emailService.sendTicketsEmail(orderId);
            } catch (emailError: any) {
                this.logger.error(`Error enviando tickets por email: ${emailError.message}`);
            }

        } catch (error: any) {
            this.logger.error(`Error procesando pago MercadoPago: ${error.message}`);
            throw error;
        }
    }

    /**
     * Verifica firma de webhook de OpenPay
     */
    private verifyOpenpaySignature(payload: any, signature: string): boolean {
        const secret = process.env.OPENPAY_WEBHOOK_SECRET;
        if (!secret) return false;

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        return signature === expectedSignature;
    }

    /**
     * Registra webhook en base de datos (MVP compliance)
     */
    private async logWebhook(data: {
        gateway: string;
        event: string;
        payload: any;
        signature?: string;
        verified: boolean;
        orderId?: string;
    }): Promise<void> {
        try {
            await this.prisma.webhookLog.create({
                data: {
                    gateway: data.gateway,
                    event: data.event,
                    payload: data.payload,
                    signature: data.signature,
                    verified: data.verified,
                    orderId: data.orderId,
                },
            });
        } catch (error: any) {
            this.logger.error(`Error logging webhook: ${error.message}`);
        }
    }

    /**
     * Genera QR único para ticket
     */
    private generateUniqueQR(): string {
        return `TKT-${Date.now()}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    }
}
