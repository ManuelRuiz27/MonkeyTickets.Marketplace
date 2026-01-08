import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { logger } from '@monomarket/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    async register(data: {
        email: string;
        password: string;
        name: string;
        businessName: string;
    }) {
        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
                role: 'ORGANIZER',
                organizer: {
                    create: {
                        businessName: data.businessName,
                    },
                },
            },
            include: {
                organizer: true,
            },
        });

        const token = this.generateToken(user.id, user.role);

        logger.info(`New organizer registered: ${user.email}`);

        return {
            user: this.sanitizeUser(user),
            token,
        };
    }

    async login(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { organizer: true },
        });

        if (!user) {
            console.log('Login failed: User not found', email);
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Login attempt:', { email, userFound: !!user, isPasswordValid });

        if (!isPasswordValid) {
            console.log('Login failed: Invalid password');
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.generateToken(user.id, user.role);

        logger.info(`User logged in: ${user.email}`);

        return {
            user: this.sanitizeUser(user),
            token,
        };
    }

    /**
     * V2: Login para RPs
     */
    async loginRP(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                rpProfile: {
                    include: {
                        event: {
                            select: {
                                id: true,
                                title: true,
                                startDate: true,
                                endDate: true,
                                venue: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user || user.role !== 'RP') {
            console.log('RP login failed: User not found or not RP role', email);
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.rpProfile) {
            throw new UnauthorizedException('RP profile not found');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            console.log('RP login failed: Invalid password');
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.generateToken(user.id, user.role);

        logger.info(`RP logged in: ${user.email}`);

        return {
            user: this.sanitizeUser(user),
            rpProfile: {
                id: user.rpProfile.id,
                eventId: user.rpProfile.eventId,
                maxTickets: user.rpProfile.maxTickets,
                ticketsGenerated: user.rpProfile.ticketsGenerated,
                ticketsUsed: user.rpProfile.ticketsUsed,
                isActive: user.rpProfile.isActive,
                event: user.rpProfile.event,
            },
            token,
        };
    }

    async validateUser(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: { organizer: true },
        });
    }

    private generateToken(userId: string, role: string): string {
        return this.jwtService.sign({ sub: userId, role });
    }

    private sanitizeUser<T extends { password?: string }>(user: T) {
        const { password, ...sanitized } = user;
        void password;
        return sanitized;
    }

    /**
     * Add token to blacklist (logout functionality)
     * Tokens are stored in Redis with TTL matching JWT expiration
     */
    async blacklistToken(token: string): Promise<void> {
        try {
            const decoded = this.jwtService.verify(token);
            const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

            if (expiresIn > 0) {
                // Store in cache with TTL matching token expiration
                await this.cacheManager.set(
                    `blacklist:${token}`,
                    'true',
                    expiresIn * 1000, // Convert to milliseconds
                );
                logger.info(`Token blacklisted for user ${decoded.sub}`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.warn('Failed to blacklist token:', message);
        }
    }

    /**
     * Check if token is blacklisted
     * Called by JWT strategy on every authenticated request
     */
    async isTokenBlacklisted(token: string): Promise<boolean> {
        try {
            const blacklisted = await this.cacheManager.get(`blacklist:${token}`);
            return !!blacklisted;
        } catch (error) {
            logger.error('Error checking token blacklist:', error);
            return false; // Fail open to avoid blocking users due to Redis issues
        }
    }
}
