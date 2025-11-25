import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { logger } from '@monomarket/config';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
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

    async validateUser(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: { organizer: true },
        });
    }

    private generateToken(userId: string, role: string): string {
        return this.jwtService.sign({ sub: userId, role });
    }

    private sanitizeUser(user: any) {
        const { password, ...sanitized } = user;
        void password;
        return sanitized;
    }
}
