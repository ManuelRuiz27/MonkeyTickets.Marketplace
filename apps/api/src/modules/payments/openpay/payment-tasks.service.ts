import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Servicio para tareas programadas relacionadas con pagos
 * 
 * Responsabilidades:
 * - Expirar órdenes PENDING que superaron su tiempo límite
 * - Liberar stock de templates cuando órdenes expiran
 * - Limpiar registros antiguos (opcional)
 */
@Injectable()
export class PaymentTasksService {
    private readonly logger = new Logger(PaymentTasksService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Ejecuta cada 30 minutos para expirar órdenes pendientes
     * 
     * Expira órdenes si:
     * - Status = PENDING
     * - reservedUntil < ahora (expiró el período de reserva)
     * - O createdAt + 72 horas < ahora (SPEI/OXXO vencidos)
     */
    @Cron(CronExpression.EVERY_30_MINUTES)
    async expirePendingOrders() {
        this.logger.log('🔍 Ejecutando tarea de expiración de órdenes pendientes...');

        try {
            const now = new Date();
            const speiOxxoExpiration = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 horas atrás

            // Buscar órdenes a expirar
            const ordersToExpire = await this.prisma.order.findMany({
                where: {
                    status: 'PENDING',
                    OR: [
                        {
                            // Reservas de checkout expiradas (5 minutos)
                            reservedUntil: {
                                lt: now,
                            },
                        },
                        {
                            // Pagos SPEI/OXXO antiguos (72 horas)
                            createdAt: {
                                lt: speiOxxoExpiration,
                            },
                            reservedUntil: null, // No son reservas de checkout
                        },
                    ],
                },
                include: {
                    items: true,
                    payment: true,
                },
            });

            if (ordersToExpire.length === 0) {
                this.logger.log('✅ No hay órdenes pendientes para expirar');
                return;
            }

            this.logger.log(`⏰ Encontradas ${ordersToExpire.length} órdenes para expirar`);

            // Procesar cada orden en transaction para atomicidad
            for (const order of ordersToExpire) {
                try {
                    await this.prisma.$transaction(async (tx) => {
                        // 1. Marcar orden como CANCELLED
                        await tx.order.update({
                            where: { id: order.id },
                            data: {
                                status: 'CANCELLED',
                                updatedAt: new Date(),
                            },
                        });

                        // 2. Marcar payment como FAILED si existe
                        if (order.payment) {
                            await tx.payment.update({
                                where: { id: order.payment.id },
                                data: {
                                    status: 'FAILED',
                                    updatedAt: new Date(),
                                },
                            });
                        }

                        // 3. Liberar stock de los templates
                        for (const item of order.items) {
                            await tx.ticketTemplate.update({
                                where: { id: item.templateId },
                                data: {
                                    sold: {
                                        decrement: item.quantity,
                                    },
                                },
                            });

                            this.logger.debug(
                                `📦 Liberado stock: ${item.quantity} unidades del template ${item.templateId}`
                            );
                        }
                    });

                    const orderAge = Math.round((now.getTime() - order.createdAt.getTime()) / (1000 * 60));
                    this.logger.log(`❌ Orden ${order.id} expirada (${orderAge} minutos de antigüedad)`);

                } catch (error: any) {
                    this.logger.error(
                        `Error expirando orden ${order.id}: ${error.message}`,
                        error.stack
                    );
                    // Continuar con las demás órdenes
                }
            }

            this.logger.log(`✅ Tarea de expiración completada. ${ordersToExpire.length} órdenes procesadas`);

        } catch (error: any) {
            this.logger.error(`❌ Error en tarea de expiración: ${error.message}`, error.stack);
        }
    }

    /**
     * Ejecuta cada día a medianoche para limpiar webhooks antiguos (opcional)
     * Mantiene solo los últimos 30 días de webhooks para performance
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async cleanupOldWebhooks() {
        this.logger.log('🧹 Ejecutando limpieza de webhooks antiguos...');

        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const result = await this.prisma.webhookLog.deleteMany({
                where: {
                    createdAt: {
                        lt: thirtyDaysAgo,
                    },
                },
            });

            this.logger.log(`🗑️ Eliminados ${result.count} webhooks antiguos (>30 días)`);

        } catch (error: any) {
            this.logger.error(`Error en limpieza de webhooks: ${error.message}`);
        }
    }

    /**
     * Método manual para forzar expiración (útil para testing)
     * Puede ser llamado vía endpoint REST si se necesita
     */
    async forceExpiration() {
        this.logger.log('⚡ Forzando expiración manual de órdenes...');
        await this.expirePendingOrders();
    }
}
