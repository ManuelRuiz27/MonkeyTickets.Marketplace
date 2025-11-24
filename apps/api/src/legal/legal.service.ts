import { Injectable } from '@nestjs/common';
import { EmailStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class LegalService {
    constructor(private readonly prisma: PrismaService) { }

    async logOrderContext(
        orderId: string,
        buyerId: string,
        ip: string,
        userAgent: string,
        termsVersion: string,
    ): Promise<void> {
        await this.prisma.legalLog.create({
            data: {
                action: 'ORDER_CONTEXT',
                entity: 'Order',
                entityId: orderId,
                metadata: {
                    buyerId,
                    userAgent,
                    termsVersion,
                } as Prisma.JsonObject,
                ipAddress: ip,
            },
        });
    }

    async logEmail(
        orderId: string,
        to: string,
        subject: string,
        providerMessageId: string,
        status: 'SENT' | 'FAILED',
    ): Promise<void> {
        await this.prisma.emailLog.create({
            data: {
                orderId,
                to,
                subject,
                providerMessageId,
                status: status === 'SENT' ? EmailStatus.SENT : EmailStatus.FAILED,
                sentAt: status === 'SENT' ? new Date() : null,
            },
        });
    }

    async findLogsByOrder(orderId: string) {
        const [legalLogs, emailLogs] = await Promise.all([
            this.prisma.legalLog.findMany({
                where: {
                    entity: 'Order',
                    entityId: orderId,
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.emailLog.findMany({
                where: { orderId },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        return { legalLogs, emailLogs };
    }
}
