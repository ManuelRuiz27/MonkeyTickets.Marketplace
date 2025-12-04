import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { getEnvVar } from '@monomarket/config';

/**
 * ReservationService handles temporary ticket locks during checkout.
 * Implements 5-minute fixed TTL as per MVP requirements.
 */
@Injectable()
export class ReservationService {
    private readonly logger = new Logger(ReservationService.name);
    private readonly redis: Redis;
    private readonly LOCK_TTL_SECONDS = 300; // 5 minutes fixed

    constructor() {
        const redisUrl = getEnvVar('REDIS_URL');
        this.redis = new Redis(redisUrl);
    }

    /**
     * Reserve tickets for a checkout session
     * @param eventId Event ID
     * @param templateId Ticket template ID
     * @param quantity Number of tickets to reserve
     * @param orderId Order ID for tracking
     * @returns true if reservation successful, false if insufficient stock
     */
    async reserveTickets(
        eventId: string,
        templateId: string,
        quantity: number,
        orderId: string,
    ): Promise<boolean> {
        const reservationKey = `reservation:${eventId}:${templateId}`;
        const lockKey = `lock:${orderId}`;

        try {
            // Check current reservations
            const currentReservations = await this.getReservedCount(eventId, templateId);

            this.logger.log(`Attempting to reserve ${quantity} tickets for template ${templateId} (current: ${currentReservations})`);

            // Store reservation with TTL
            await this.redis.setex(
                lockKey,
                this.LOCK_TTL_SECONDS,
                JSON.stringify({ eventId, templateId, quantity, timestamp: new Date().toISOString() }),
            );

            // Increment reservation counter
            const multi = this.redis.multi();
            multi.incrby(reservationKey, quantity);
            multi.expire(reservationKey, this.LOCK_TTL_SECONDS);
            await multi.exec();

            this.logger.log(`Reserved ${quantity} tickets for order ${orderId}, expires in ${this.LOCK_TTL_SECONDS}s`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to reserve tickets: ${error.message}`, error.stack);
            return false;
        }
    }

    /**
     * Release ticket reservation (on payment or cancellation)
     * @param orderId Order ID
     */
    async releaseReservation(orderId: string): Promise<void> {
        const lockKey = `lock:${orderId}`;

        try {
            const lockData = await this.redis.get(lockKey);
            if (!lockData) {
                this.logger.warn(`No reservation found for order ${orderId}`);
                return;
            }

            const { eventId, templateId, quantity } = JSON.parse(lockData);
            const reservationKey = `reservation:${eventId}:${templateId}`;

            // Decrement reservation counter
            await this.redis.decrby(reservationKey, quantity);

            // Remove lock
            await this.redis.del(lockKey);

            this.logger.log(`Released ${quantity} tickets for order ${orderId}`);
        } catch (error: any) {
            this.logger.error(`Failed to release reservation: ${error.message}`, error.stack);
        }
    }

    /**
     * Get total reserved tickets for a template
     * @param eventId Event ID
     * @param templateId Template ID
     * @returns Number of currently reserved tickets
     */
    async getReservedCount(eventId: string, templateId: string): Promise<number> {
        const reservationKey = `reservation:${eventId}:${templateId}`;
        const count = await this.redis.get(reservationKey);
        return count ? parseInt(count, 10) : 0;
    }

    /**
     * Check if sufficient tickets are available (considering reservations)
     * @param templateId Template ID
     * @param totalStock Total tickets available
     * @param soldCount Already sold  tickets
     * @param requestedQuantity Requested quantity
     * @returns true if available
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
     * @param orderId Order ID
     * @returns true if extended successfully
     */
    async extendReservation(orderId: string): Promise<boolean> {
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
            return false;
        }
    }

    /**
     * Get remaining time for a reservation
     * @param orderId Order ID
     * @returns seconds remaining, or -1 if not found
     */
    async getReservationTTL(orderId: string): Promise<number> {
        const lockKey = `lock:${orderId}`;
        return await this.redis.ttl(lockKey);
    }
}
