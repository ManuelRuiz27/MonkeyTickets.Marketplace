import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { getEnvVar } from '@monomarket/config';

interface MemoryLock {
    eventId: string;
    templateId: string;
    quantity: number;
    expiresAt: number;
}

/**
 * ReservationService handles temporary ticket locks during checkout.
 * In ausencia de Redis, cae en un almacenamiento en memoria útil para desarrollo local.
 */
@Injectable()
export class ReservationService {
    private readonly logger = new Logger(ReservationService.name);
    private redis?: Redis;
    private readonly LOCK_TTL_SECONDS = 300; // 5 minutos
    private useMemoryStore = false;
    private memoryReservations = new Map<string, number>();
    private memoryLocks = new Map<string, MemoryLock>();
    private memoryTimers = new Map<string, NodeJS.Timeout>();

    constructor() {
        try {
            const redisUrl = getEnvVar('REDIS_URL');
            this.redis = new Redis(redisUrl, {
                lazyConnect: true,
                maxRetriesPerRequest: 3,
            });
            this.redis.on('error', (error) => {
                this.logger.error(`Redis error: ${error?.message ?? error}`);
                this.enableMemoryFallback(error);
            });
            this.redis.connect().catch((error) => {
                this.logger.error(`Redis connection failed: ${error?.message ?? error}`);
                this.enableMemoryFallback(error);
            });
        } catch (error: any) {
            this.logger.warn(`REDIS_URL no configurado (${error?.message ?? error}). Usando reservas en memoria.`);
            this.useMemoryStore = true;
        }
    }

    /**
     * Reserve tickets for a checkout session
     */
    async reserveTickets(
        eventId: string,
        templateId: string,
        quantity: number,
        orderId: string,
    ): Promise<boolean> {
        if (this.useMemoryStore || !this.redis) {
            return this.reserveInMemory(eventId, templateId, quantity, orderId);
        }

        const reservationKey = `reservation:${eventId}:${templateId}`;
        const lockKey = `lock:${orderId}`;

        try {
            const currentReservations = await this.getReservedCount(eventId, templateId);
            this.logger.log(`Attempting to reserve ${quantity} tickets for template ${templateId} (current: ${currentReservations})`);

            await this.redis.setex(
                lockKey,
                this.LOCK_TTL_SECONDS,
                JSON.stringify({ eventId, templateId, quantity, timestamp: new Date().toISOString() }),
            );

            const multi = this.redis.multi();
            multi.incrby(reservationKey, quantity);
            multi.expire(reservationKey, this.LOCK_TTL_SECONDS);
            await multi.exec();

            this.logger.log(`Reserved ${quantity} tickets for order ${orderId}, expires in ${this.LOCK_TTL_SECONDS}s`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to reserve tickets: ${error.message}`, error.stack);
            this.enableMemoryFallback(error);
            return this.reserveInMemory(eventId, templateId, quantity, orderId);
        }
    }

    /**
     * Release ticket reservation (on payment or cancellation)
     */
    async releaseReservation(orderId: string): Promise<void> {
        if (this.useMemoryStore || !this.redis) {
            this.releaseMemoryReservation(orderId);
            return;
        }

        const lockKey = `lock:${orderId}`;

        try {
            const lockData = await this.redis.get(lockKey);
            if (!lockData) {
                this.logger.warn(`No reservation found for order ${orderId}`);
                return;
            }

            const { eventId, templateId, quantity } = JSON.parse(lockData);
            const reservationKey = `reservation:${eventId}:${templateId}`;

            await this.redis.decrby(reservationKey, quantity);
            await this.redis.del(lockKey);

            this.logger.log(`Released ${quantity} tickets for order ${orderId}`);
        } catch (error: any) {
            this.logger.error(`Failed to release reservation: ${error.message}`, error.stack);
            this.enableMemoryFallback(error);
            this.releaseMemoryReservation(orderId);
        }
    }

    /**
     * Get total reserved tickets for a template
     */
    async getReservedCount(eventId: string, templateId: string): Promise<number> {
        if (this.useMemoryStore || !this.redis) {
            return this.getMemoryReservedCount(eventId, templateId);
        }

        const reservationKey = `reservation:${eventId}:${templateId}`;
        const count = await this.redis.get(reservationKey);
        return count ? parseInt(count, 10) : 0;
    }

    /**
     * Check if sufficient tickets are available (considering reservations)
     */
    async checkAvailability(
        eventId: string,
        templateId: string,
        totalStock: number,
        soldCount: number,
        requestedQuantity: number,
    ): Promise<boolean> {
        const reserved = await this.getReservedCount(eventId, templateId);
        const available = totalStock - soldCount - reserved;

        this.logger.debug(`Availability check: total=${totalStock}, sold=${soldCount}, reserved=${reserved}, requested=${requestedQuantity}, available=${available}`);

        return available >= requestedQuantity;
    }

    /**
     * Extend reservation (if user needs more time)
     */
    async extendReservation(orderId: string): Promise<boolean> {
        if (this.useMemoryStore || !this.redis) {
            return this.extendMemoryReservation(orderId);
        }

        const lockKey = `lock:${orderId}`;

        try {
            const exists = await this.redis.exists(lockKey);
            if (!exists) {
                return false;
            }

            await this.redis.expire(lockKey, this.LOCK_TTL_SECONDS);
            this.logger.log(`Extended reservation for order ${orderId}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to extend reservation: ${error.message}`);
            this.enableMemoryFallback(error);
            return this.extendMemoryReservation(orderId);
        }
    }

    /**
     * Get remaining time for a reservation
     */
    async getReservationTTL(orderId: string): Promise<number> {
        if (this.useMemoryStore || !this.redis) {
            return this.getMemoryReservationTTL(orderId);
        }

        const lockKey = `lock:${orderId}`;
        return await this.redis.ttl(lockKey);
    }

    private reserveInMemory(eventId: string, templateId: string, quantity: number, orderId: string): boolean {
        const key = this.getMemoryKey(eventId, templateId);
        const current = this.memoryReservations.get(key) ?? 0;
        this.memoryReservations.set(key, current + quantity);

        const expiresAt = Date.now() + this.LOCK_TTL_SECONDS * 1000;
        this.memoryLocks.set(orderId, { eventId, templateId, quantity, expiresAt });
        this.scheduleMemoryExpiration(orderId);

        this.logger.log(`Reserved ${quantity} tickets for order ${orderId} (in-memory)`);
        return true;
    }

    private releaseMemoryReservation(orderId: string) {
        const lock = this.memoryLocks.get(orderId);
        if (!lock) {
            this.logger.warn(`No reservation found for order ${orderId} (in-memory)`);
            return;
        }

        const key = this.getMemoryKey(lock.eventId, lock.templateId);
        const current = this.memoryReservations.get(key) ?? 0;
        const nextValue = Math.max(current - lock.quantity, 0);
        if (nextValue === 0) {
            this.memoryReservations.delete(key);
        } else {
            this.memoryReservations.set(key, nextValue);
        }

        this.memoryLocks.delete(orderId);
        const timer = this.memoryTimers.get(orderId);
        if (timer) {
            clearTimeout(timer);
            this.memoryTimers.delete(orderId);
        }

        this.logger.log(`Released ${lock.quantity} tickets for order ${orderId} (in-memory)`);
    }

    private getMemoryReservedCount(eventId: string, templateId: string): number {
        const key = this.getMemoryKey(eventId, templateId);
        return this.memoryReservations.get(key) ?? 0;
    }

    private extendMemoryReservation(orderId: string): boolean {
        const lock = this.memoryLocks.get(orderId);
        if (!lock) {
            return false;
        }
        lock.expiresAt = Date.now() + this.LOCK_TTL_SECONDS * 1000;
        this.memoryLocks.set(orderId, lock);
        this.scheduleMemoryExpiration(orderId);
        this.logger.log(`Extended reservation for order ${orderId} (in-memory)`);
        return true;
    }

    private getMemoryReservationTTL(orderId: string): number {
        const lock = this.memoryLocks.get(orderId);
        if (!lock) {
            return -1;
        }
        const remaining = Math.floor((lock.expiresAt - Date.now()) / 1000);
        return remaining > 0 ? remaining : -1;
    }

    private scheduleMemoryExpiration(orderId: string) {
        const lock = this.memoryLocks.get(orderId);
        if (!lock) {
            return;
        }

        const existingTimer = this.memoryTimers.get(orderId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const delay = Math.max(lock.expiresAt - Date.now(), 0);
        const timer = setTimeout(() => {
            this.memoryTimers.delete(orderId);
            this.releaseMemoryReservation(orderId);
        }, delay);
        this.memoryTimers.set(orderId, timer);
    }

    private getMemoryKey(eventId: string, templateId: string): string {
        return `${eventId}:${templateId}`;
    }

    private enableMemoryFallback(error: any) {
        if (this.useMemoryStore) {
            return;
        }

        this.logger.warn(
            `Falling back a reservas en memoria por indisponibilidad de Redis (${error?.message ?? error}).`,
        );
        this.useMemoryStore = true;
        if (this.redis) {
            try {
                this.redis.disconnect();
            } catch (disconnectError: any) {
                this.logger.warn(`Error al desconectar Redis: ${disconnectError?.message ?? disconnectError}`);
            }
        }
        this.redis = undefined;
    }
}
