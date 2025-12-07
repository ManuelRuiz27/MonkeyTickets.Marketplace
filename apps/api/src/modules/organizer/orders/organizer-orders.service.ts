import { BadRequestException, Injectable } from '@nestjs/common';
import { OrdersService } from '../../orders/orders.service';
import { EmailService } from '../../email/email.service';

@Injectable()
export class OrganizerOrdersService {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly emailService: EmailService,
    ) { }

    listEventOrders(organizerId: string, eventId: string) {
        return this.ordersService.listByEvent(organizerId, eventId);
    }

    getOrderDetail(organizerId: string, orderId: string) {
        return this.ordersService.getByIdForOrganizer(orderId, organizerId);
    }

    async resendTickets(organizerId: string, orderId: string) {
        const order = await this.ordersService.getByIdForOrganizer(orderId, organizerId);

        if (!order.buyer?.email) {
            throw new BadRequestException('Buyer email is required to resend tickets');
        }

        await this.emailService.resendTickets(order.id);

        return { status: 'sent' };
    }
}

