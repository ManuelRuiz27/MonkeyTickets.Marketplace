import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TemplatesService } from './templates.service';

// Templates module handles ticket template management
@Module({
    imports: [PrismaModule],
    providers: [TemplatesService],
    exports: [TemplatesService],
})
export class TemplatesModule { }
