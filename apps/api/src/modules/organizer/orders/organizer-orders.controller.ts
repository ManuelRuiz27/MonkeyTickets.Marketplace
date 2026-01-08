import { BadRequestException, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { OrganizerOrdersService } from './organizer-orders.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../auth/auth.types';

@Controller('organizer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class OrganizerOrdersController {
    constructor(private readonly organizerOrdersService: OrganizerOrdersService) { }

    @Get('events/:eventId/orders')
    listOrders(
        @Req() req: AuthenticatedRequest,
        @Param('eventId') eventId: string,
    ) {
        const organizerId = this.requireOrganizerId(req);
        return this.organizerOrdersService.listEventOrders(organizerId, eventId);
    }

    @Get('orders/:orderId')
    orderDetail(
        @Req() req: AuthenticatedRequest,
        @Param('orderId') orderId: string,
    ) {
        const organizerId = this.requireOrganizerId(req);
        return this.organizerOrdersService.getOrderDetail(organizerId, orderId);
    }

    @Post('orders/:orderId/resend-tickets')
    resendTickets(
        @Req() req: AuthenticatedRequest,
        @Param('orderId') orderId: string,
    ) {
        const organizerId = this.requireOrganizerId(req);
        return this.organizerOrdersService.resendTickets(organizerId, orderId);
    }

    private requireOrganizerId(req: AuthenticatedRequest) {
        const organizerId = req.user?.organizer?.id;
        if (!organizerId) {
            throw new BadRequestException('Organizer context is required');
        }
        return organizerId;
    }
}
