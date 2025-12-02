import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { logger, getEnvVar, getEnvNumber } from '@monomarket/config';
import helmet from 'helmet';
import { EnvValidationService } from './config/env.validation';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Validate environment variables on startup
    const envValidation = app.get(EnvValidationService);
    envValidation.validateEnvironment();

    // Security headers with Helmet
    const isProduction = process.env.NODE_ENV === 'production';
    app.use(
        helmet({
            contentSecurityPolicy: isProduction ? undefined : false, // Disable in dev for easier debugging
            crossOriginEmbedderPolicy: false, // Allow embedding for payment iframes
        }),
    );

    // Global prefix
    app.setGlobalPrefix('api');

    // Enhanced CORS configuration
    const corsOrigin = getEnvVar('CORS_ORIGIN', 'http://localhost:5173,http://localhost:5174,http://localhost:5175');
    const origins = corsOrigin.split(',').map(o => o.trim());

    // Ensure scanner is always allowed in development
    if (!isProduction && !origins.includes('http://localhost:5174')) {
        origins.push('http://localhost:5174');
    }

    app.enableCors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman)
            if (!origin) return callback(null, true);

            if (origins.includes(origin) || origins.includes('*')) {
                callback(null, true);
            } else {
                logger.warn(`CORS blocked request from origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-organizer-id'],
        exposedHeaders: ['x-total-count', 'x-page', 'x-per-page'],
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
    await app.listen(port, '0.0.0.0');

    logger.info(`🚀 MonoMarket Tickets API running on http://localhost:${port}/api`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔒 Security: Helmet enabled, CORS configured`);
    logger.info(`🌍 Allowed origins: ${origins.join(', ')}`);
    console.log('TEST LOG FROM MAIN.TS');
}

bootstrap();
