import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

/**
 * Middleware de idempotencia para prevenir duplicados en pagos
 * Usa header Idempotency-Key para trackear requests
 */
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
    private readonly cache = new Map<string, { response: unknown; timestamp: number }>();
    private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

    use(req: Request, res: Response<unknown>, next: NextFunction) {
        const idempotencyKey = req.headers['idempotency-key'] as string;

        // Solo aplicar a métodos que modifican estado
        if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
            return next();
        }

        // Si no hay key, continuar normal (opcional: requerir key)
        if (!idempotencyKey) {
            return next();
        }

        // Validar formato de la key
        if (idempotencyKey.length < 16 || idempotencyKey.length > 255) {
            throw new BadRequestException('Idempotency-Key debe tener entre 16 y 255 caracteres');
        }

        // Crear hash único combinando key + ruta + body
        const requestHash = this.createRequestHash(idempotencyKey, req.path, req.body);

        // Verificar si ya existe esta request
        const cached = this.cache.get(requestHash);
        if (cached) {
            const age = Date.now() - cached.timestamp;

            if (age < this.TTL_MS) {
                // Request duplicada dentro del TTL, retornar respuesta cacheada
                const cachedResponse = cached.response;
                const cachedBody =
                    cachedResponse && typeof cachedResponse === 'object'
                        ? { ...(cachedResponse as Record<string, unknown>) }
                        : { data: cachedResponse };
                return res.status(200).json({
                    ...cachedBody,
                    _idempotent: true,
                    _cached_ago_ms: age,
                });
            } else {
                // TTL expirado, eliminar del cache
                this.cache.delete(requestHash);
            }
        }

        // Interceptar la respuesta para cachearla
        const originalJson = res.json.bind(res);
        res.json = (body: unknown) => {
            // Cachear solo respuestas exitosas
            if (res.statusCode >= 200 && res.statusCode < 300) {
                this.cache.set(requestHash, {
                    response: body,
                    timestamp: Date.now(),
                });

                // Cleanup viejo (cada 100 requests)
                if (Math.random() < 0.01) {
                    this.cleanupExpired();
                }
            }

            return originalJson(body);
        };

        next();
    }

    /**
     * Crea hash único del request
     */
    private createRequestHash(key: string, path: string, body: unknown): string {
        const content = `${key}:${path}:${JSON.stringify(body)}`;
        return createHash('sha256').update(content).digest('hex');
    }

    /**
     * Limpia entradas expiradas del cache
     */
    private cleanupExpired(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.TTL_MS) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[Idempotency] Limpiadas ${cleaned} entradas expiradas del cache`);
        }
    }
}
