import type { Request } from 'express';
import type { Organizer, User } from '@prisma/client';

export type AuthenticatedUser = Omit<User, 'password'> & {
    organizer?: Organizer | null;
    userId?: string;
};

export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}
