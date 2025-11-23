/**
 * Environment variable utilities
 * Provides type-safe access to environment variables with validation
 */

/**
 * Get environment variable with optional fallback
 * @throws Error if variable is not found and no fallback is provided
 */
export function getEnvVar(name: string, fallback?: string): string {
    const value = process.env[name] ?? fallback;
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

/**
 * Get environment variable as number
 * @throws Error if variable is not a valid number
 */
export function getEnvNumber(name: string, fallback?: number): number {
    const value = process.env[name];
    if (!value) {
        if (fallback !== undefined) {
            return fallback;
        }
        throw new Error(`Missing required environment variable: ${name}`);
    }
    const parsed = Number(value);
    if (isNaN(parsed)) {
        throw new Error(`Environment variable ${name} is not a valid number: ${value}`);
    }
    return parsed;
}

/**
 * Get environment variable as boolean
 */
export function getEnvBoolean(name: string, fallback = false): boolean {
    const value = process.env[name];
    if (!value) {
        return fallback;
    }
    return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
    return process.env.NODE_ENV === 'test';
}
