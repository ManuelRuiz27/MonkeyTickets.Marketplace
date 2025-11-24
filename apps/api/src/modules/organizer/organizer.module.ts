import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TemplatesModule } from '../templates/templates.module';
import { MailModule } from '../mail/mail.module';
import { OrdersModule } from '../orders/orders.module';
import { OrganizerEventsController } from './events/organizer-events.controller';
import { OrganizerEventsService } from './events/organizer-events.service';
import { OrganizerTemplatesController } from './templates/organizer-templates.controller';
import { OrganizerTemplatesService } from './templates/organizer-templates.service';
import { OrganizerOrdersController } from './orders/organizer-orders.controller';
import { OrganizerOrdersService } from './orders/organizer-orders.service';

@Module({
    imports: [PrismaModule, TemplatesModule, OrdersModule, MailModule],
    controllers: [
        OrganizerEventsController,
        OrganizerTemplatesController,
        OrganizerOrdersController,
    ],
    providers: [
        OrganizerEventsService,
        OrganizerTemplatesService,
        OrganizerOrdersService,
    ],
})
export class OrganizerModule { }
