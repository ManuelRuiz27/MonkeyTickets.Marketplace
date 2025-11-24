import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Post, Put } from '@nestjs/common';
import { OrganizerEventsService } from './organizer-events.service';
import { CreateOrganizerEventDto } from './dto/create-organizer-event.dto';
import { UpdateOrganizerEventDto } from './dto/update-organizer-event.dto';
import { AssignTemplateDto } from './dto/assign-template.dto';

@Controller('organizer/events')
export class OrganizerEventsController {
    constructor(private readonly organizerEventsService: OrganizerEventsService) { }

    @Get()
    listEvents(@Headers('x-organizer-id') organizerId?: string) {
        return this.organizerEventsService.list(this.requireOrganizerId(organizerId));
    }

    @Post()
    createEvent(
        @Headers('x-organizer-id') organizerId: string | undefined,
        @Body() dto: CreateOrganizerEventDto,
    ) {
        return this.organizerEventsService.create(this.requireOrganizerId(organizerId), dto);
    }

    @Get(':id')
    getEvent(
        @Headers('x-organizer-id') organizerId: string | undefined,
        @Param('id') eventId: string,
    ) {
        return this.organizerEventsService.get(this.requireOrganizerId(organizerId), eventId);
    }

    @Put(':id')
    updateEvent(
        @Headers('x-organizer-id') organizerId: string | undefined,
        @Param('id') eventId: string,
        @Body() dto: UpdateOrganizerEventDto,
    ) {
        return this.organizerEventsService.update(this.requireOrganizerId(organizerId), eventId, dto);
    }

    @Delete(':id')
    cancelEvent(
        @Headers('x-organizer-id') organizerId: string | undefined,
        @Param('id') eventId: string,
    ) {
        return this.organizerEventsService.cancel(this.requireOrganizerId(organizerId), eventId);
    }

    @Put(':id/template')
    assignTemplate(
        @Headers('x-organizer-id') organizerId: string | undefined,
        @Param('id') eventId: string,
        @Body() dto: AssignTemplateDto,
    ) {
        return this.organizerEventsService.assignTemplate(
            this.requireOrganizerId(organizerId),
            eventId,
            dto.templateId,
        );
    }

    private requireOrganizerId(id?: string): string {
        if (!id) {
            throw new BadRequestException('Organizer context is required. TODO: add auth guard');
        }
        return id;
    }
}
