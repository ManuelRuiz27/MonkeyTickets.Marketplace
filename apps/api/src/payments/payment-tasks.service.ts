import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ORDER_FULFILLMENT_JOB, ORDER_FULFILLMENT_QUEUE } from './payment.constants';

@Injectable()
export class PaymentTasksService {
    private readonly logger = new Logger(PaymentTasksService.name);

    constructor(
        @InjectQueue(ORDER_FULFILLMENT_QUEUE)
        private readonly queue: Queue,
    ) { }

    async enqueueOrderFulfillment(orderId: string) {
        try {
            await this.queue.add(
                ORDER_FULFILLMENT_JOB,
                { orderId },
                {
                    attempts: 5,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                    removeOnComplete: true,
                    removeOnFail: false,
                },
            );
            this.logger.log(`Order ${orderId} enqueued for fulfillment`);
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Failed to enqueue fulfillment for order ${orderId}: ${err.message}`, err.stack);
            throw err;
        }
    }
}
