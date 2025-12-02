import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
    constructor(private readonly prisma: PrismaService) { }

    async check() {
        const basePayload = {
            status: 'ok' as const,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
        };

        try {
            await this.prisma.$queryRaw(Prisma.sql`SELECT 1`);

            return {
                ...basePayload,
                database: 'ok' as const,
            };
        } catch (error) {
            throw new ServiceUnavailableException({
                ...basePayload,
                status: 'error' as const,
                database: 'unreachable' as const,
                message: error instanceof Error ? error.message : 'Unknown database error',
            });
        }
    }
}
