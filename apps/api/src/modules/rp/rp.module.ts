import { Module } from '@nestjs/common';
import { RPService } from './rp.service';
import {
    RPController,
    RPManagementController,
    RPPublicController
} from './rp.controller';
import { RPTicketsService } from './rp-tickets.service';
import { RPTicketsController } from './rp-tickets.controller';
import { RPDashboardService } from './rp-dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
    imports: [PrismaModule, TicketsModule],
    controllers: [
        RPController,
        RPManagementController,
        RPPublicController,
        RPTicketsController,
    ],
    providers: [RPService, RPTicketsService, RPDashboardService],
    exports: [RPService, RPTicketsService, RPDashboardService],
})
export class RPModule { }
