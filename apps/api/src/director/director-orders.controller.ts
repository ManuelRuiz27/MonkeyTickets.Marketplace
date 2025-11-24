import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { DirectorOrdersService } from './director-orders.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';
import { SearchOrdersDto } from './dto/search-orders.dto';

@Controller('director/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DIRECTOR')
export class DirectorOrdersController {
    constructor(private readonly ordersService: DirectorOrdersService) { }

    @Get()
    searchOrders(@Query() query: SearchOrdersDto) {
        return this.ordersService.searchOrders(query);
    }

    @Get(':id')
    getOrder(@Param('id') id: string) {
        return this.ordersService.getOrderDetail(id);
    }

    @Post(':id/resend-tickets')
    resendTickets(@Param('id') id: string) {
        return this.ordersService.resendTickets(id);
    }
}
