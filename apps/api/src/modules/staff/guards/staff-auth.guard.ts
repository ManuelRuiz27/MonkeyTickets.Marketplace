import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { StaffService } from '../staff.service';
import { ActiveStaffSession } from '../staff.types';
import type { Request } from 'express';

export interface StaffAuthenticatedRequest extends Request {
    staffSession?: ActiveStaffSession;
}

@Injectable()
export class StaffAuthGuard implements CanActivate {
    constructor(private readonly staffService: StaffService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<StaffAuthenticatedRequest>();
        const token = this.extractToken(request);

        if (!token) {
            throw new UnauthorizedException('Staff token required');
        }

        const session = await this.staffService.verifyToken(token);
        request.staffSession = session;
        return true;
    }

    private extractToken(request: Request): string | null {
        const headerToken = request.headers['x-staff-token'];
        if (typeof headerToken === 'string' && headerToken.trim()) {
            return headerToken.trim();
        }

        const auth = request.headers['authorization'];
        if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
            return auth.substring(7).trim();
        }

        return null;
    }
}
