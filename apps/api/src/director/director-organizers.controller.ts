import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { DirectorOrganizersService } from './director-organizers.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';
import { PaginationQueryDto } from './dto/pagination.dto';
import { UpdateOrganizerStatusDto } from './dto/update-organizer-status.dto';
import { UpdateOrganizerFeePlanDto } from './dto/update-organizer-fee-plan.dto';

@Controller('director/organizers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DIRECTOR')
export class DirectorOrganizersController {
    constructor(private readonly organizersService: DirectorOrganizersService) { }

    @Get()
    listOrganizers(@Query() query: PaginationQueryDto) {
        return this.organizersService.listOrganizers(query);
    }

    @Get(':id')
    getOrganizer(@Param('id') id: string) {
        return this.organizersService.getOrganizerDetails(id);
    }

    @Put(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateOrganizerStatusDto,
    ) {
        return this.organizersService.updateStatus(id, dto.status);
    }

    @Put(':id/fee-plan')
    updateFeePlan(
        @Param('id') id: string,
        @Body() dto: UpdateOrganizerFeePlanDto,
    ) {
        return this.organizersService.updateFeePlan(id, dto);
    }
}
