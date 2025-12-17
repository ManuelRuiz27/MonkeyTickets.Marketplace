import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizerModule } from './modules/organizer/organizer.module';
import { EventsModule } from './modules/events/events.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { TicketModule } from './modules/tickets/ticket.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { DirectorModule } from './modules/director/director.module';
import { LegalModule } from './modules/legal/legal.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { EnvValidationService } from './config/env.validation';
import { HealthModule } from './modules/health/health.module';
import { StaffModule } from './modules/staff/staff.module';
import { RPModule } from './modules/rp/rp.module';

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        ScheduleModule.forRoot(),
        PrismaModule,
        AuthModule,
        OrganizerModule,
        EventsModule,
        CheckoutModule,
        TicketModule,
        TemplatesModule,
        DirectorModule,
        LegalModule,
        HealthModule,
        StaffModule,
        RPModule,
    ],
    providers: [EnvValidationService],
    exports: [EnvValidationService],
})
export class AppModule { }
