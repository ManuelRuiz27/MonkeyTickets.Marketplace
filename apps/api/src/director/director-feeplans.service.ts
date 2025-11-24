import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';
import { PaginationQueryDto } from './dto/pagination.dto';
import { CreateFeePlanDto } from './dto/create-fee-plan.dto';
import { UpdateFeePlanDto } from './dto/update-fee-plan.dto';

@Injectable()
export class DirectorFeePlansService {
    constructor(private readonly prisma: PrismaService) { }

    async listFeePlans(query: PaginationQueryDto) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const skip = (page - 1) * pageSize;

        const [total, plans] = await Promise.all([
            this.prisma.feePlan.count(),
            this.prisma.feePlan.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
        ]);

        return {
            data: plans,
            meta: {
                page,
                pageSize,
                total,
            },
        };
    }

    createFeePlan(dto: CreateFeePlanDto) {
        return this.prisma.feePlan.create({
            data: {
                name: dto.name,
                description: dto.description,
                platformFeePercent: new Prisma.Decimal(dto.platformFeePercent),
                platformFeeFixed: new Prisma.Decimal(dto.platformFeeFixed),
                paymentGatewayFeePercent: new Prisma.Decimal(dto.paymentGatewayFeePercent),
                isDefault: dto.isDefault ?? false,
            },
        });
    }

    async updateFeePlan(id: string, dto: UpdateFeePlanDto) {
        const data: Prisma.FeePlanUpdateInput = {};

        if (dto.name !== undefined) {
            data.name = dto.name;
        }
        if (dto.description !== undefined) {
            data.description = dto.description;
        }
        if (dto.platformFeePercent !== undefined) {
            data.platformFeePercent = new Prisma.Decimal(dto.platformFeePercent);
        }
        if (dto.platformFeeFixed !== undefined) {
            data.platformFeeFixed = new Prisma.Decimal(dto.platformFeeFixed);
        }
        if (dto.paymentGatewayFeePercent !== undefined) {
            data.paymentGatewayFeePercent = new Prisma.Decimal(dto.paymentGatewayFeePercent);
        }
        if (dto.isDefault !== undefined) {
            data.isDefault = dto.isDefault;
        }

        return this.prisma.feePlan.update({
            where: { id },
            data,
        });
    }

    async deleteFeePlan(id: string) {
        const usageCount = await this.prisma.organizer.count({
            where: { feePlanId: id },
        });

        if (usageCount > 0) {
            throw new BadRequestException('Cannot delete a fee plan that is assigned to organizers');
        }

        return this.prisma.feePlan.delete({
            where: { id },
        });
    }
}
