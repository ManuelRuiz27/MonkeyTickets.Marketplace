import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentGateway, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';
import { PaymentsConfigService } from './payments.config';
import { ProcessPaymentDto } from './dto/process-payment.dto';

interface ProviderResult {
    providerPaymentId: string;
    redirectUrl?: string;
    instructions?: string;
}

type OrderWithRelations = Prisma.OrderGetPayload<{
    include: {
        payment: true;
        buyer: true;
        items: { include: { template: true } };
        event: true;
    };
}>;

@Injectable()
export class PaymentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: PaymentsConfigService,
    ) { }

    async processPayment(dto: ProcessPaymentDto) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId },
            include: {
                payment: true,
                buyer: true,
                items: {
                    include: {
                        template: true,
                    },
                },
                event: true,
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.status !== 'PENDING') {
            throw new BadRequestException('Order is not pending payment');
        }

        const providerResult = await this.processMercadoPagoPayment(order, dto);

        const payment = await this.prisma.payment.upsert({
            where: { orderId: order.id },
            update: {
                gateway: PaymentGateway.MERCADOPAGO,
                amount: order.total,
                currency: order.currency,
                status: PaymentStatus.PENDING,
                gatewayTransactionId: providerResult.providerPaymentId,
                paymentMethod: dto.method,
            },
            create: {
                orderId: order.id,
                gateway: PaymentGateway.MERCADOPAGO,
                amount: order.total,
                currency: order.currency,
                status: PaymentStatus.PENDING,
                gatewayTransactionId: providerResult.providerPaymentId,
                paymentMethod: dto.method,
            },
        });

        return {
            paymentId: payment.id,
            providerPaymentId: providerResult.providerPaymentId,
            redirectUrl: providerResult.redirectUrl,
            instructions: providerResult.instructions,
        };
    }

    private async processMercadoPagoPayment(
        order: OrderWithRelations,
        dto: ProcessPaymentDto,
    ): Promise<ProviderResult> {
        const accessToken = this.config.getMercadoPagoAccessToken();
        void accessToken;

        const baseId = `mp_${dto.method}_${Date.now()}`;
        let redirectUrl: string | undefined;
        let instructions: string | undefined;

        if (['spei', 'oxxo'].includes(dto.method)) {
            redirectUrl = `https://pay.mercadopago.com/${baseId}`;
            instructions = dto.method === 'spei'
                ? 'Utiliza la referencia SPEI generada para completar la transferencia.'
                : 'Acude a un punto OXXO y paga usando la referencia proporcionada.';
        } else {
            // For card-based flows return status immediately; frontend should show redirect or confirmation.
            redirectUrl = undefined;
        }

        return {
            providerPaymentId: baseId,
            redirectUrl,
            instructions,
        };
    }
}
