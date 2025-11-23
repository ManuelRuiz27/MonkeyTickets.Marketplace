import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { logger } from '@monomarket/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await this.$connect();
        logger.info('✅ Database connected successfully');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        logger.info('👋 Database disconnected');
    }
}
