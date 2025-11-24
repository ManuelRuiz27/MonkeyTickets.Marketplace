import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DirectorMetricsService } from './director-metrics.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';
import { DateRangeQueryDto } from './dto/date-range.dto';
import { TopEntitiesQueryDto } from './dto/top-query.dto';

@Controller('director/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DIRECTOR')
export class DirectorMetricsController {
    constructor(private readonly metricsService: DirectorMetricsService) { }

    @Get('overview')
    getOverview(@Query() query: DateRangeQueryDto) {
        return this.metricsService.getOverview(query);
    }

    @Get('top-organizers')
    getTopOrganizers(@Query() query: TopEntitiesQueryDto) {
        return this.metricsService.getTopOrganizers(query);
    }

    @Get('top-events')
    getTopEvents(@Query() query: TopEntitiesQueryDto) {
        return this.metricsService.getTopEvents(query);
    }
}
