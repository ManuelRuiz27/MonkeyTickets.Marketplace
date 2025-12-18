import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// V2: Nightclub System
import { RPManagementService } from './rp-management.service';
import {
    RPUsersController,
    RPUserManagementController,
} from './rp-management.controller';

// V2: Guest Types
import { GuestTypesService } from './guest-types.service';
import {
    GuestTypesByEventController,
    GuestTypesManagementController,
} from './guest-types.controller';

// V2: RP Ticket Generation
import { RPTicketsV2Service } from './rp-tickets-v2.service';
import { RPTicketsV2Controller } from './rp-tickets-v2.controller';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '30d' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [
        RPUsersController,
        RPUserManagementController,
        GuestTypesByEventController,
        GuestTypesManagementController,
        RPTicketsV2Controller,
    ],
    providers: [
        RPManagementService,
        GuestTypesService,
        RPTicketsV2Service,
    ],
    exports: [
        RPManagementService,
        GuestTypesService,
        RPTicketsV2Service,
    ],
})
export class RPModule { }
