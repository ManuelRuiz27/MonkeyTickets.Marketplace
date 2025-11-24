import { BadRequestException, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { OrganizerOrdersService } from './organizer-orders.service';

@Controller('organizer')
export class OrganizerOrdersController {
    constructor(private readonly organizerOrdersService: OrganizerOrdersService) { }

    @Get('events/:eventId/orders')
    listOrders(
        @Headers('x-organizer-id') organizerId: string | undefined,
        @Param('eventId') eventId: string,
    ) {
        return this.organizerOrdersService.listEventOrders(this.requireOrganizerId(organizerId), eventId);
    }

    @Get('orders/:orderId')
    orderDetail(
        @Headers('x-organizer-id') organizerId: string | undefined,
        @Param('orderId') orderId: string,
    ) {
        return this.organizerOrdersService.getOrderDetail(this.requireOrganizerId(organizerId), orderId);
    }

    @Post('orders/:orderId/resend-tickets')
    resendTickets(
        @Headers('x-organizer-id') organizerId: string | undefined,
        @Param('orderId') orderId: string,
    ) {
        return this.organizerOrdersService.resendTickets(this.requireOrganizerId(organizerId), orderId);
    }

    private requireOrganizerId(id?: string) {
        if (!id) {
            throw new BadRequestException('Organizer context is required. TODO: add auth guard');
        }
        return id;
    }
}
