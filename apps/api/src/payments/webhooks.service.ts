import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PaymentGateway, PaymentStatus, Prisma } from '@prisma/client';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { PrismaService } from '../modules/prisma/prisma.service';
import { PaymentsConfigService } from './payments.config';
import { PaymentTasksService } from './payment-tasks.service';
import * as crypto from 'crypto';

interface WebhookPayload {
    type?: string;
    action?: string;
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
    private readonly logger = new Logger(PaymentsWebhooksService.name);
    private readonly mpPaymentClient: Payment;

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: PaymentsConfigService,
        private readonly paymentTasks: PaymentTasksService,
    ) {
        const mpClient = new MercadoPagoConfig({
            accessToken: this.config.getMercadoPagoAccessToken(),
        });
        this.mpPaymentClient = new Payment(mpClient);
    }

    async handleMercadoPagoWebhook(payload: WebhookPayload, signature?: string, requestId?: string) {
        const providerPaymentId = payload?.data?.id
            ?? payload?.resource?.id
            ?? payload?.data?.resource?.id
            ?? payload?.id;

        if (!providerPaymentId) {
            throw new BadRequestException('Missing Mercado Pago payment id');
        }

        const isValidSignature = this.verifyMercadoPagoSignature(signature, requestId, payload);
        if (!isValidSignature) {
            this.logger.warn('Mercado Pago signature could not be validated; proceeding with caution');
        }

        const payment = await this.fetchMercadoPagoPayment(String(providerPaymentId));
        const newStatus = this.mapMercadoPagoStatus(payment.status);

        if (!newStatus) {
            await this.createLegalLog(null, 'MP_WEBHOOK_IGNORED', {
                payload,
                paymentStatus: payment.status,
            });
            return;
        }

        const orderId = payment.external_reference
            ?? payment.metadata?.orderId
            ?? payload.data?.order?.id
            ?? payload.external_reference;

        await this.processPaymentUpdate({
            provider: PaymentGateway.MERCADOPAGO,
            providerPaymentId: String(providerPaymentId),
            orderId,
            newStatus,
            eventType: payload.type || payload.action,
            payload,
        });
    }

    private async processPaymentUpdate(params: ProcessParams) {
        const { provider, providerPaymentId, orderId, newStatus, payload, eventType } = params;
        if (!providerPaymentId) {
            throw new BadRequestException('Missing provider payment identifier');
        }

        const payment = await this.prisma.payment.findFirst({
            where: {
                OR: [
                    { gatewayTransactionId: providerPaymentId },
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
                    gatewayTransactionId: providerPaymentId,
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

    private mapMercadoPagoStatus(status?: string): PaymentStatus | null {
        switch (status) {
            case 'approved':
                return PaymentStatus.COMPLETED;
            case 'authorized':
            case 'in_process':
            case 'pending':
                return PaymentStatus.PENDING;
            case 'rejected':
            case 'cancelled':
            case 'charged_back':
            case 'refunded':
                return PaymentStatus.FAILED;
            default:
                return null;
        }
    }

    private verifyMercadoPagoSignature(signature?: string, requestId?: string, payload?: any): boolean {
        try {
            const secret = this.config.getMercadoPagoWebhookSecret();
            if (!signature || !requestId) {
                return false;
            }
            const raw = `${requestId}.${JSON.stringify(payload ?? {})}`;
            const computed = crypto.createHmac('sha256', secret).update(raw).digest('hex');
            return signature.includes(computed);
        } catch (error: any) {
            this.logger.warn(`Error verifying Mercado Pago signature: ${error.message}`);
            return false;
        }
    }

    private async fetchMercadoPagoPayment(paymentId: string) {
        try {
            return await this.mpPaymentClient.get({ id: paymentId });
        } catch (error: any) {
            this.logger.error(`Failed to fetch Mercado Pago payment ${paymentId}: ${error.message}`);
            throw new BadRequestException('Could not fetch Mercado Pago payment');
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
