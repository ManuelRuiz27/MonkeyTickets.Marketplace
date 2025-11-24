import { Module } from '@nestjs/common';
import { LegalService } from '../../legal/legal.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [LegalService],
    exports: [LegalService],
})
export class LegalModule { }
