import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Post } from '@nestjs/common';
import { OrganizerTemplatesService } from './organizer-templates.service';
import { CreateOrganizerTemplateDto } from './dto/create-organizer-template.dto';

@Controller('organizer/templates')
export class OrganizerTemplatesController {
    constructor(private readonly organizerTemplatesService: OrganizerTemplatesService) { }

    @Get()
    listTemplates(@Headers('x-organizer-id') organizerId?: string) {
        return this.organizerTemplatesService.list(this.requireOrganizerId(organizerId));
    }

    @Post()
    createTemplate(
        @Headers('x-organizer-id') organizerId: string | undefined,
        @Body() dto: CreateOrganizerTemplateDto,
    ) {
        return this.organizerTemplatesService.create(this.requireOrganizerId(organizerId), dto);
    }

    @Delete(':id')
    deleteTemplate(
        @Headers('x-organizer-id') organizerId: string | undefined,
        @Param('id') templateId: string,
    ) {
        return this.organizerTemplatesService.delete(this.requireOrganizerId(organizerId), templateId);
    }

    private requireOrganizerId(id?: string): string {
        if (!id) {
            throw new BadRequestException('Organizer context is required. TODO: add auth guard');
        }
        return id;
    }
}
