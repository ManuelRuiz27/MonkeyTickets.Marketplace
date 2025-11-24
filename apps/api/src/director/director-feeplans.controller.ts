import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { DirectorFeePlansService } from './director-feeplans.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';
import { PaginationQueryDto } from './dto/pagination.dto';
import { CreateFeePlanDto } from './dto/create-fee-plan.dto';
import { UpdateFeePlanDto } from './dto/update-fee-plan.dto';

@Controller('director/fee-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DIRECTOR')
export class DirectorFeePlansController {
    constructor(private readonly feePlansService: DirectorFeePlansService) { }

    @Get()
    listFeePlans(@Query() query: PaginationQueryDto) {
        return this.feePlansService.listFeePlans(query);
    }

    @Post()
    createFeePlan(@Body() dto: CreateFeePlanDto) {
        return this.feePlansService.createFeePlan(dto);
    }

    @Put(':id')
    updateFeePlan(
        @Param('id') id: string,
        @Body() dto: UpdateFeePlanDto,
    ) {
        return this.feePlansService.updateFeePlan(id, dto);
    }

    @Delete(':id')
    deleteFeePlan(@Param('id') id: string) {
        return this.feePlansService.deleteFeePlan(id);
    }
}
