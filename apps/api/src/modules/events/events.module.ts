import { Module } from '@nestjs/common';
import { EventsController, OrganizerEventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [EventsController, OrganizerEventsController],
    providers: [EventsService],
    exports: [EventsService],
})
export class EventsModule { }
