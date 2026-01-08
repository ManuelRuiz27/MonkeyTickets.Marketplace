import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('organizer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANIZER')
export class OrganizerDashboardController {
    constructor(private prisma: PrismaService) { }

    @Get('summary')
    async getSummary(@CurrentUser() user: AuthenticatedUser) {
        // Get organizer from user
        const organizer = await this.prisma.organizer.findUnique({
            where: { userId: user.id },
            include: {
                feePlan: true,
            },
        });

        if (!organizer) {
            throw new Error('Organizer not found');
        }

        // Get all events for this organizer
        const events = await this.prisma.event.findMany({
            where: { organizerId: organizer.id },
            include: {
                templates: true,
                orders: {
                    where: {
                        status: 'PAID',
                    },
                },
            },
        });

        // Calculate metrics
        const totalEvents = events.length;
        const activeEvents = events.filter((e) => e.status === 'PUBLISHED').length;

        // Calculate total tickets sold
        const totalTicketsSold = events.reduce((total, event) => {
            return (
                total +
                event.templates.reduce((templateTotal, template) => {
                    return templateTotal + (template.sold || 0);
                }, 0)
            );
        }, 0);

        // Calculate revenue
        const totalRevenue = events.reduce((total, event) => {
            return (
                total +
                event.orders.reduce((orderTotal, order) => {
                    return orderTotal + Number(order.total);
                }, 0)
            );
        }, 0);

        // Calculate organizer income (after platform fees)
        const organizerIncome = events.reduce((total, event) => {
            return (
                total +
                event.orders.reduce((orderTotal, order) => {
                    return orderTotal + Number(order.organizerIncomeAmount || 0);
                }, 0)
            );
        }, 0);

        // Calculate platform fees
        const platformFees = totalRevenue - organizerIncome;

        // Get cortesías info
        const totalCortesias = events.reduce((total, event) => {
            const capacity = event.capacity || 0;
            const cortesiasLimit = capacity <= 100 ? 5 : 330;
            return total + cortesiasLimit;
        }, 0);

        const usedCortesias = events.reduce((total, event) => {
            return (
                total +
                event.templates.reduce((templateTotal, template) => {
                    // Count tickets with price 0 as cortesías
                    return templateTotal + (Number(template.price) === 0 ? template.sold || 0 : 0);
                }, 0)
            );
        }, 0);

        return {
            businessName: organizer.businessName,
            totalRevenue,
            organizerIncome,
            platformFees,
            totalTicketsSold,
            totalEvents,
            activeEvents,
            feePlan: organizer.feePlan ? {
                name: organizer.feePlan.name,
                platformFeePercent: organizer.feePlan.platformFeePercent,
                complementaryFee: organizer.feePlan.complementaryFee,
            } : {
                name: 'Sin plan asignado',
                platformFeePercent: 0,
                complementaryFee: 0,
            },
            cortesias: {
                total: totalCortesias,
                used: usedCortesias,
                available: totalCortesias - usedCortesias,
            },
        };
    }
}
