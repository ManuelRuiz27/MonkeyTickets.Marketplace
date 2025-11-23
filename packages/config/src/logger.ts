/**
 * Shared logger utility using Pino
 * Provides structured logging with pretty printing in development
 */

import pino from 'pino';
import { isDevelopment } from './env';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: isDevelopment()
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
});

export default logger;
