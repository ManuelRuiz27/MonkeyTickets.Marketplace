import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { logger, getEnvVar, getEnvNumber } from '@monomarket/config';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Global prefix
    app.setGlobalPrefix('api');

    // CORS configuration
    const corsOrigin = getEnvVar('CORS_ORIGIN', 'http://localhost:5173,http://localhost:5174,http://localhost:5175');
    const origins = corsOrigin.split(',');
    
    // Ensure scanner is always allowed (dev fix)
    if (!origins.includes('http://localhost:5174')) {
        origins.push('http://localhost:5174');
    }

    app.enableCors({
        origin: origins,
        credentials: true,
    });



    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    const port = getEnvNumber('PORT', 3000);
    await app.listen(port);

    logger.info(`🚀 MonoMarket Tickets API running on http://localhost:${port}/api`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
