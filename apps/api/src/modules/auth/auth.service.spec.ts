import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
    let service: AuthService;

    const mockPrismaService = {
        user: {
            create: jest.fn(),
            findUnique: jest.fn(),
        },
    };

    const mockJwtService = {
        sign: jest.fn(),
        verify: jest.fn(),
    };

    const mockCacheManager = {
        set: jest.fn(),
        get: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: mockCacheManager,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);

        // Reset mocks
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('login', () => {
        it('should return user and token on successful login', async () => {
            const mockUser = {
                id: '1',
                email: 'test@example.com',
                password: await bcrypt.hash('password123', 10),
                role: 'ORGANIZER',
                name: 'Test User',
                organizer: { id: 'org1' },
            };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            mockJwtService.sign.mockReturnValue('mock-token');

            const result = await service.login('test@example.com', 'password123');

            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('token');
            expect(result.token).toBe('mock-token');
            expect('password' in result.user).toBe(false);
        });

        it('should throw UnauthorizedException for invalid email', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(
                service.login('invalid@example.com', 'password123'),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for invalid password', async () => {
            const mockUser = {
                id: '1',
                email: 'test@example.com',
                password: await bcrypt.hash('correctpassword', 10),
                role: 'ORGANIZER',
            };

            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

            await expect(
                service.login('test@example.com', 'wrongpassword'),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('blacklistToken', () => {
        it('should blacklist a valid token', async () => {
            const mockToken = 'valid-jwt-token';
            const mockDecoded = {
                sub: 'user-id',
                exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
            };

            mockJwtService.verify.mockReturnValue(mockDecoded);
            mockCacheManager.set.mockResolvedValue(undefined);

            await service.blacklistToken(mockToken);

            expect(mockJwtService.verify).toHaveBeenCalledWith(mockToken);
            expect(mockCacheManager.set).toHaveBeenCalledWith(
                `blacklist:${mockToken}`,
                'true',
                expect.any(Number),
            );
        });

        it('should not blacklist an expired token', async () => {
            const mockToken = 'expired-jwt-token';
            const mockDecoded = {
                sub: 'user-id',
                exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
            };

            mockJwtService.verify.mockReturnValue(mockDecoded);

            await service.blacklistToken(mockToken);

            expect(mockCacheManager.set).not.toHaveBeenCalled();
        });

        it('should handle invalid tokens gracefully', async () => {
            const mockToken = 'invalid-token';
            mockJwtService.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await expect(service.blacklistToken(mockToken)).resolves.not.toThrow();
        });
    });

    describe('isTokenBlacklisted', () => {
        it('should return true for blacklisted token', async () => {
            mockCacheManager.get.mockResolvedValue('true');

            const result = await service.isTokenBlacklisted('blacklisted-token');

            expect(result).toBe(true);
            expect(mockCacheManager.get).toHaveBeenCalledWith('blacklist:blacklisted-token');
        });

        it('should return false for non-blacklisted token', async () => {
            mockCacheManager.get.mockResolvedValue(null);

            const result = await service.isTokenBlacklisted('valid-token');

            expect(result).toBe(false);
        });

        it('should return false on cache error (fail-open)', async () => {
            mockCacheManager.get.mockRejectedValue(new Error('Redis connection failed'));

            const result = await service.isTokenBlacklisted('some-token');

            expect(result).toBe(false);
        });
    });

    describe('register', () => {
        it('should create user and return token', async () => {
            const registerData = {
                email: 'newuser@example.com',
                password: 'password123',
                name: 'New User',
                businessName: 'Test Business',
            };

            const mockCreatedUser = {
                id: '2',
                email: registerData.email,
                password: 'hashed-password',
                name: registerData.name,
                role: 'ORGANIZER',
                organizer: {
                    id: 'org2',
                    businessName: registerData.businessName,
                },
            };

            mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);
            mockJwtService.sign.mockReturnValue('new-user-token');

            const result = await service.register(registerData);

            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('token');
            expect(result.user.email).toBe(registerData.email);
            expect('password' in result.user).toBe(false);
        });
    });
});
