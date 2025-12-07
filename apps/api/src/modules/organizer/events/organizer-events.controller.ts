import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { OrganizerEventsService } from './organizer-events.service';
import { CreateOrganizerEventDto } from './dto/create-organizer-event.dto';
import { UpdateOrganizerEventDto } from './dto/update-organizer-event.dto';
import { AssignTemplateDto } from './dto/assign-template.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('organizer/events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class OrganizerEventsController {
    constructor(private readonly organizerEventsService: OrganizerEventsService) { }

    @Get()
    listEvents(@Req() req: any) {
        const organizerId = this.requireOrganizerId(req);
        return this.organizerEventsService.list(organizerId);
    }

    @Post()
    createEvent(
        @Req() req: any,
        @Body() dto: CreateOrganizerEventDto,
    ) {
        const organizerId = this.requireOrganizerId(req);
        return this.organizerEventsService.create(organizerId, dto);
    }

    @Get(':id')
    getEvent(
        @Req() req: any,
        @Param('id') eventId: string,
    ) {
        const organizerId = this.requireOrganizerId(req);
        return this.organizerEventsService.get(organizerId, eventId);
    }

    @Put(':id')
    updateEvent(
        @Req() req: any,
        @Param('id') eventId: string,
        @Body() dto: UpdateOrganizerEventDto,
    ) {
        const organizerId = this.requireOrganizerId(req);
        return this.organizerEventsService.update(organizerId, eventId, dto);
    }

    @Delete(':id')
    cancelEvent(
        @Req() req: any,
        @Param('id') eventId: string,
    ) {
        const organizerId = this.requireOrganizerId(req);
        return this.organizerEventsService.cancel(organizerId, eventId);
    }

    @Put(':id/template')
    assignTemplate(
        @Req() req: any,
        @Param('id') eventId: string,
        @Body() dto: AssignTemplateDto,
    ) {
        return this.organizerEventsService.assignTemplate(
            this.requireOrganizerId(req),
            eventId,
            dto.templateId,
        );
    }

    private requireOrganizerId(req: any): string {
        const organizerId = req.user?.organizer?.id;
        if (!organizerId) {
            throw new BadRequestException('Organizer context is required');
        }
        return organizerId;
    }
}
