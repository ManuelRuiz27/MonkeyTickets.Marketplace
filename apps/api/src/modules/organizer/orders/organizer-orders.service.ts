import { BadRequestException, Injectable } from '@nestjs/common';
import { OrdersService } from '../../orders/orders.service';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class OrganizerOrdersService {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly mailService: MailService,
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

        const attachments = order.tickets
            .map((ticket) => {
                const source = (ticket as unknown as { pdfUrl?: string | null; pdfPath?: string | null });
                const path = source.pdfUrl ?? source.pdfPath ?? null;
                if (!path) {
                    return null;
                }
                return {
                    filename: `${ticket.id}.pdf`,
                    path,
                };
            })
            .filter((attachment): attachment is { filename: string; path: string } => Boolean(attachment));

        await this.mailService.sendTicketsEmail({
            orderId: order.id,
            to: order.buyer.email,
            subject: `Reenvío de boletos para ${order.event.title}`,
            text: `Hola ${order.buyer.name ?? ''}, reenviamos tus boletos.`,
            attachments,
        });

        return { status: 'sent' };
    }
}
