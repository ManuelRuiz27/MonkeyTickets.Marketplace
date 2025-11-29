import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PaymentGateway, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';
import { PaymentsConfigService } from './payments.config';
import { PaymentTasksService } from './payment-tasks.service';
import * as crypto from 'crypto';

interface WebhookPayload {
    type?: string;
    data?: any;
    [key: string]: any;
}

interface ProcessParams {
    provider: PaymentGateway;
    providerPaymentId: string;
    orderId?: string;
    newStatus: PaymentStatus;
    eventType?: string;
    payload: any;
}

@Injectable()
export class PaymentsWebhooksService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: PaymentsConfigService,
        private readonly paymentTasks: PaymentTasksService,
    ) { }

    async handleMercadoPagoWebhook(payload: WebhookPayload, signature?: string) {
        this.verifySignature(
            signature,
            this.config.getMercadoPagoWebhookSecret(),
            payload,
            'MercadoPago',
        );

        const eventType = payload.type || payload.action;
        const data = payload.data?.id ? payload.data : payload.resource ?? payload.data ?? {};
        const providerPaymentId = data.id || payload.data?.id;
        const orderId = data.order?.id || data.metadata?.orderId || payload.order?.id || payload.external_reference;

        const newStatus = this.mapMercadoPagoStatus(eventType, payload);
        if (!newStatus) {
            await this.createLegalLog(null, 'MP_WEBHOOK_IGNORED', {
                payload,
                reason: `Unhandled event type ${eventType}`,
            });
            return;
        }

        await this.processPaymentUpdate({
            provider: PaymentGateway.MERCADOPAGO,
            providerPaymentId,
            orderId,
            newStatus,
            eventType,
            payload,
        });
    }

    private async processPaymentUpdate(params: ProcessParams) {
        const { provider, providerPaymentId, orderId, newStatus, payload, eventType } = params;
        if (!providerPaymentId) {
            throw new BadRequestException('Missing provider payment identifier');
        }
        const normalizedProviderPaymentId = String(providerPaymentId);

        const payment = await this.prisma.payment.findFirst({
            where: {
                OR: [
                    { gatewayTransactionId: normalizedProviderPaymentId },
                    ...(orderId ? [{ orderId }] : []),
                ],
            },
            include: {
                order: {
                    include: {
                        event: {
                            include: {
                                organizer: {
                                    include: {
                                        feePlan: true,
                                        user: true,
                                    },
                                },
                            },
                        },
                        buyer: true,
                    },
                },
            },
        });

        if (!payment) {
            await this.createLegalLog(null, 'PAYMENT_WEBHOOK_NOT_FOUND', {
                provider,
                providerPaymentId,
                orderId,
                payload,
            });
            throw new BadRequestException('Payment not found');
        }

        const finalStatuses: PaymentStatus[] = [PaymentStatus.COMPLETED, PaymentStatus.FAILED];
        if (finalStatuses.includes(payment.status)) {
            await this.createLegalLog(payment.order.event.organizer.userId, 'PAYMENT_WEBHOOK_DUPLICATE', {
                provider,
                providerPaymentId,
                orderId: payment.orderId,
                payload,
                eventType,
            });
            return;
        }

        let shouldEnqueueFulfillment = false;
        let orderStatus = payment.order.status;

        await this.prisma.$transaction(async (tx) => {
            const updatedPayment = await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: newStatus,
                    gatewayTransactionId: normalizedProviderPaymentId,
                },
            });

            if (newStatus === PaymentStatus.COMPLETED) {
                const { platformFeeAmount, organizerIncomeAmount } = this.computeFees(
                    payment.order.total,
                    payment.order.event.organizer.feePlan ?? undefined,
                );

                await tx.order.update({
                    where: { id: payment.orderId },
                    data: {
                        status: 'PAID',
                        paidAt: new Date(),
                        platformFeeAmount,
                        organizerIncomeAmount,
                    },
                });

                orderStatus = 'PAID';
                shouldEnqueueFulfillment = true;
            } else if (newStatus === PaymentStatus.FAILED) {
                await tx.order.update({
                    where: { id: payment.orderId },
                    data: {
                        status: 'PENDING',
                    },
                });
                orderStatus = 'PENDING';
            }

            await tx.legalLog.create({
                data: {
                    userId: payment.order.event.organizer.userId,
                    action: 'PAYMENT_WEBHOOK',
                    entity: 'Payment',
                    entityId: payment.id,
                    metadata: {
                        provider,
                        eventType,
                        payload,
                        paymentStatus: updatedPayment.status,
                        orderStatus,
                    },
                },
            });
        });

        if (shouldEnqueueFulfillment) {
            await this.paymentTasks.enqueueOrderFulfillment(payment.orderId);
        }
    }

    private computeFees(
        total: Prisma.Decimal,
        feePlan?: { platformFeePercent?: Prisma.Decimal | null; platformFeeFixed?: Prisma.Decimal | null },
    ) {
        const amount = Number(total);
        const percent = Number(feePlan?.platformFeePercent ?? 0);
        const fixed = Number(feePlan?.platformFeeFixed ?? 0);
        const platformFeeAmount = Number((amount * (percent / 100) + fixed).toFixed(2));
        const organizerIncomeAmount = Number((amount - platformFeeAmount).toFixed(2));
        return { platformFeeAmount, organizerIncomeAmount };
    }

    private mapMercadoPagoStatus(eventType?: string, payload?: any): PaymentStatus | null {
        const status = payload?.data?.status || payload?.status;

        if (status === 'approved') {
            return PaymentStatus.COMPLETED;
        }
        if (status === 'rejected' || status === 'cancelled') {
            return PaymentStatus.FAILED;
        }

        switch (eventType) {
            case 'payment.approved':
                return PaymentStatus.COMPLETED;
            case 'payment.rejected':
                return PaymentStatus.FAILED;
            default:
                return null;
        }
    }

    private verifySignature(signature: string | undefined, secret: string, payload: any, provider: string) {
        if (!signature) {
            throw new UnauthorizedException(`${provider} signature missing`);
        }

        const computed = crypto.createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        const computedBuffer = Buffer.from(computed);
        const providedBuffer = Buffer.from(signature);

        if (computedBuffer.length !== providedBuffer.length) {
            throw new UnauthorizedException(`${provider} signature mismatch`);
        }

        const isValid = crypto.timingSafeEqual(computedBuffer, providedBuffer);

        if (!isValid) {
            throw new UnauthorizedException(`${provider} signature mismatch`);
        }
    }

    private async createLegalLog(userId: string | null, action: string, metadata: any) {
        await this.prisma.legalLog.create({
            data: {
                userId,
                action,
                entity: 'Payment',
                metadata,
            },
        });
    }
}
