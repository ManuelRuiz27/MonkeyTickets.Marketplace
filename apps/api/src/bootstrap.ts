import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { EnvValidationService } from './config/env.validation';
import { getEnvVar, logger } from '@monomarket/config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

const DEFAULT_CORS_ORIGINS = 'http://localhost:5173,http://localhost:5174,http://localhost:5175';

export interface BootstrapResult {
    app: INestApplication;
    origins: string[];
    isProduction: boolean;
}

export async function createApplication(): Promise<BootstrapResult> {
    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    if (!process.env.API_URL && process.env.VERCEL_URL) {
        process.env.API_URL = `https://${process.env.VERCEL_URL}`;
    }

    const envValidation = app.get(EnvValidationService);
    envValidation.validateEnvironment();

    const isProduction = process.env.NODE_ENV === 'production';
    app.use(
        helmet({
            contentSecurityPolicy: isProduction ? undefined : false,
            crossOriginEmbedderPolicy: false,
        }),
    );

    app.setGlobalPrefix('api');

    // Global error filter (también en entorno serverless)
    app.useGlobalFilters(new AllExceptionsFilter());

    const corsOrigin = getEnvVar('CORS_ORIGIN', DEFAULT_CORS_ORIGINS);
    const origins = corsOrigin
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);

    if (!isProduction && !origins.includes('http://localhost:5174')) {
        origins.push('http://localhost:5174');
    }

    app.enableCors({
        origin: (origin, callback) => {
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
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['x-total-count', 'x-page', 'x-per-page'],
    });

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

    await app.init();

    return {
        app,
        origins,
        isProduction,
    };
}
