import { Injectable } from '@nestjs/common';
import { TemplatesService } from '../../templates/templates.service';
import { CreateOrganizerTemplateDto } from './dto/create-organizer-template.dto';

@Injectable()
export class OrganizerTemplatesService {
    constructor(private readonly templatesService: TemplatesService) { }

    list(organizerId: string) {
        return this.templatesService.listByOrganizer(organizerId);
    }

    create(organizerId: string, dto: CreateOrganizerTemplateDto) {
        return this.templatesService.createForOrganizer(organizerId, {
            name: dto.name,
            description: dto.description,
            price: dto.price,
            currency: dto.currency,
            quantity: dto.quantity,
            eventId: dto.eventId,
        });
    }

    delete(organizerId: string, templateId: string) {
        return this.templatesService.deleteForOrganizer(organizerId, templateId);
    }
}
