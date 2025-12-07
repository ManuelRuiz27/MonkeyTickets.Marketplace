import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { OrganizerTemplatesService } from './organizer-templates.service';
import { CreateOrganizerTemplateDto } from './dto/create-organizer-template.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('organizer/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class OrganizerTemplatesController {
    constructor(private readonly organizerTemplatesService: OrganizerTemplatesService) { }

    @Get()
    listTemplates(@Req() req: any) {
        const organizerId = this.requireOrganizerId(req);
        return this.organizerTemplatesService.list(organizerId);
    }

    @Post()
    createTemplate(
        @Req() req: any,
        @Body() dto: CreateOrganizerTemplateDto,
    ) {
        const organizerId = this.requireOrganizerId(req);
        return this.organizerTemplatesService.create(organizerId, dto);
    }

    @Delete(':id')
    deleteTemplate(
        @Req() req: any,
        @Param('id') templateId: string,
    ) {
        const organizerId = this.requireOrganizerId(req);
        return this.organizerTemplatesService.delete(organizerId, templateId);
    }

    private requireOrganizerId(req: any): string {
        const organizerId = req.user?.organizer?.id;
        if (!organizerId) {
            throw new BadRequestException('Organizer context is required');
        }
        return organizerId;
    }
}
