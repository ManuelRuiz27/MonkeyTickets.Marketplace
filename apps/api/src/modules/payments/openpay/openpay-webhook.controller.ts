import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    Headers,
    Logger,
    BadRequestException,
    RawBodyRequest,
    Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import * as crypto from 'crypto';

/**
 * Webhook Controller para procesar notificaciones de OpenPay
 * 
 * OpenPay envía webhooks cuando:
 * - charge.succeeded: Pago completado
 * - charge.failed: Pago fallido
 * - charge.cancelled: Pago cancelado
 * 
 * Seguridad: Valida firma HMAC para autenticar requests de OpenPay
 */
@Controller('payments/webhooks')
export class OpenpayWebhookController {
    private readonly logger = new Logger(OpenpayWebhookController.name);
    private readonly webhookSecret: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
    ) {
        this.webhookSecret = process.env.OPENPAY_WEBHOOK_SECRET || '';
        if (!this.webhookSecret) {
            this.logger.warn('⚠️ OPENPAY_WEBHOOK_SECRET no está configurado. Los webhooks NO serán validados.');
        }
    }

    /**
     * Endpoint principal de webhooks
     * POST /payments/webhooks/openpay
     */
    @Post('openpay')
    @HttpCode(HttpStatus.OK)
    async handleWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Body() payload: any,
        @Headers('openpay-signature') signature: string,
    ) {
        this.logger.log(`📩 Webhook recibido: ${payload.type || 'unknown'}`);

        try {
            // 1. Log del webhook (para debugging y compliance)
            const webhookLog = await this.prisma.webhookLog.create({
                data: {
                    gateway: 'OPENPAY',
                    event: payload.type || 'unknown',
                    payload: payload,
                    signature: signature || null,
                    verified: false,
                },
            });

            // 2. Validar firma HMAC (si está configurada)
            if (this.webhookSecret) {
                const isValid = this.verifyWebhookSignature(req.rawBody || '', signature);

                await this.prisma.webhookLog.update({
                    where: { id: webhookLog.id },
                    data: { verified: isValid },
                });

                if (!isValid) {
                    this.logger.error('❌ Firma de webhook inválida. Posible intento de fraude.');
                    throw new BadRequestException('Firma inválida');
                }

                this.logger.debug('✅ Firma de webhook verificada');
            }

            // 3. Procesar evento según tipo
            if (payload.type === 'charge.succeeded') {
                await this.handleChargeSucceeded(payload, webhookLog.id);
            } else if (payload.type === 'charge.failed') {
                await this.handleChargeFailed(payload, webhookLog.id);
            } else if (payload.type === 'charge.cancelled') {
                await this.handleChargeCancelled(payload, webhookLog.id);
            } else {
                this.logger.warn(`⚠️ Evento no manejado: ${payload.type}`);
            }

            return { received: true };

        } catch (error: any) {
            this.logger.error(`❌ Error procesando webhook: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Maneja evento charge.succeeded (pago completado)
     */
    private async handleChargeSucceeded(payload: any, webhookLogId: string) {
        const transaction = payload.transaction;
        const chargeId = transaction?.id;
        const orderId = transaction?.order_id;

        if (!orderId) {
            this.logger.error('❌ Webhook sin order_id');
            return;
        }

        this.logger.log(`✅ Pago completado para orden ${orderId}, cargo ${chargeId}`);

        try {
            // Buscar orden
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
                include: {
                    event: true,
                    buyer: true,
                    items: {
                        include: {
                            template: true,
                        },
                    },
                },
            });

            if (!order) {
                this.logger.error(`❌ Orden ${orderId} no encontrada`);
                return;
            }

            // Evitar procesamiento duplicado
            if (order.status === 'PAID') {
                this.logger.warn(`⚠️ Orden ${orderId} ya marcada como PAID. Ignorando webhook duplicado.`);
                return;
            }

            // Actualizar orden y payment en transacción
            await this.prisma.$transaction(async (tx) => {
                // 1. Actualizar orden a PAID
                await tx.order.update({
                    where: { id: orderId },
                    data: {
                        status: 'PAID',
                        paidAt: new Date(),
                    },
                });

                // 2. Actualizar payment
                await tx.payment.updateMany({
                    where: { orderId: orderId },
                    data: {
                        status: 'COMPLETED',
                        gatewayTransactionId: chargeId,
                    },
                });

                // 3. Generar tickets (solo si no existen)
                const existingTickets = await tx.ticket.count({
                    where: { orderId: orderId },
                });

                if (existingTickets === 0) {
                    this.logger.log(`📝 Generando tickets para orden ${orderId}`);

                    for (const item of order.items) {
                        for (let i = 0; i < item.quantity; i++) {
                            const qrCode = `${orderId}-${item.templateId}-${Date.now()}-${i}`;

                            await tx.ticket.create({
                                data: {
                                    orderId: orderId,
                                    templateId: item.templateId,
                                    qrCode: qrCode,
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

                // 4. Vincular webhook log con orden
                await tx.webhookLog.update({
                    where: { id: webhookLogId },
                    data: { orderId: orderId },
                });
            });

            // 5. Enviar email de confirmación con tickets
            this.logger.log(`📧 Enviando email de confirmación a ${order.buyer.email}`);
            await this.emailService.sendTicketsEmail(orderId);

            this.logger.log(`🎉 Orden ${orderId} procesada exitosamente`);

        } catch (error: any) {
            this.logger.error(`❌ Error procesando orden ${orderId}: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Maneja evento charge.failed (pago fallido)
     */
    private async handleChargeFailed(payload: any, webhookLogId: string) {
        const transaction = payload.transaction;
        const orderId = transaction?.order_id;

        if (!orderId) return;

        this.logger.warn(`⚠️ Pago fallido para orden ${orderId}`);

        await this.prisma.payment.updateMany({
            where: { orderId: orderId },
            data: { status: 'FAILED' },
        });

        await this.prisma.webhookLog.update({
            where: { id: webhookLogId },
            data: { orderId: orderId },
        });
    }

    /**
     * Maneja evento charge.cancelled (pago cancelado)
     */
    private async handleChargeCancelled(payload: any, webhookLogId: string) {
        const transaction = payload.transaction;
        const orderId = transaction?.order_id;

        if (!orderId) return;

        this.logger.warn(`⚠️ Pago cancelado para orden ${orderId}`);

        await this.prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' },
        });

        await this.prisma.payment.updateMany({
            where: { orderId: orderId },
            data: { status: 'FAILED' },
        });

        await this.prisma.webhookLog.update({
            where: { id: webhookLogId },
            data: { orderId: orderId },
        });
    }

    /**
     * Verifica la firma HMAC-SHA256 del webhook
     */
    private verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
        if (!signature || !this.webhookSecret) {
            return false;
        }

        try {
            const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
            const expectedSignature = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(bodyString)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            this.logger.error('Error verificando firma:', error);
            return false;
        }
    }
}
