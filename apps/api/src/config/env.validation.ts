import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvValidationService {
    constructor(private configService: ConfigService) { }

    validateEnvironment(): void {
        const errors: string[] = [];
        const nodeEnv = this.configService.get<string>('NODE_ENV');

        // Validate JWT_SECRET
        const jwtSecret = this.configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
            errors.push('JWT_SECRET is required');
        } else if (jwtSecret.length < 64) {
            errors.push('JWT_SECRET must be at least 64 characters (256 bits)');
        } else if (jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
            errors.push('JWT_SECRET must be changed from default value');
        }

        // Validate DATABASE_URL
        const databaseUrl = this.configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
            errors.push('DATABASE_URL is required');
        } else if (!databaseUrl.startsWith('postgresql://')) {
            errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
        } else {
            try {
                const parsedUrl = new URL(databaseUrl);
                const hostname = parsedUrl.hostname.toLowerCase();
                const localHosts = ['localhost', '127.0.0.1', '::1'];

                if (nodeEnv === 'production' && localHosts.includes(hostname)) {
                    errors.push('DATABASE_URL cannot point to localhost in production');
                }
            } catch {
                errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
            }
        }

        // Validate REDIS_URL
        const redisUrl = this.configService.get<string>('REDIS_URL');
        if (!redisUrl) {
            errors.push('REDIS_URL is required');
        }

        // Validate URLs
        const apiUrl = this.configService.get<string>('API_URL');
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');

        if (!apiUrl) {
            errors.push('API_URL is required');
        }

        if (!frontendUrl) {
            errors.push('FRONTEND_URL is required');
        }

        // If there are errors, throw and prevent startup
        if (errors.length > 0) {
            const errorMessage = `
╔════════════════════════════════════════════════════════════╗
║  ENVIRONMENT VALIDATION FAILED                             ║
╠════════════════════════════════════════════════════════════╣
${errors.map(err => `║  ❌ ${err.padEnd(55)}║`).join('\n')}
╚════════════════════════════════════════════════════════════╝
      `;

            console.error(errorMessage);
            throw new Error('Environment validation failed. Please check your .env file.');
        }

        console.log('✅ Environment validation passed');
    }
}
