import { Module } from '@nestjs/common';
import { LegalModule } from '../legal/legal.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { EmailModule } from '../email/email.module';
import { DirectorLegalController } from '../../director/legal.controller';
import { DirectorMetricsController } from '../../director/director-metrics.controller';
import { DirectorOrganizersController } from '../../director/director-organizers.controller';
import { DirectorFeePlansController } from '../../director/director-feeplans.controller';
import { DirectorOrdersController } from '../../director/director-orders.controller';
import { DirectorMetricsService } from '../../director/director-metrics.service';
import { DirectorOrganizersService } from '../../director/director-organizers.service';
import { DirectorFeePlansService } from '../../director/director-feeplans.service';
import { DirectorOrdersService } from '../../director/director-orders.service';

@Module({
    imports: [PrismaModule, LegalModule, MailModule, EmailModule],
    controllers: [
        DirectorLegalController,
        DirectorMetricsController,
        DirectorOrganizersController,
        DirectorFeePlansController,
        DirectorOrdersController,
    ],
    providers: [
        DirectorMetricsService,
        DirectorOrganizersService,
        DirectorFeePlansService,
        DirectorOrdersService,
    ],
})
export class DirectorModule { }
