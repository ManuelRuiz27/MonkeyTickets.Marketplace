import { Test, TestingModule } from '@nestjs/testing';
import { EnvValidationService } from './env.validation';
import { ConfigService } from '@nestjs/config';

describe('EnvValidationService', () => {
    let service: EnvValidationService;

    const createMockConfigService = (envVars: Record<string, string>) => ({
        get: jest.fn((key: string, defaultValue?: string) => {
            return envVars[key] ?? defaultValue;
        }),
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EnvValidationService,
                {
                    provide: ConfigService,
                    useValue: createMockConfigService({}),
                },
            ],
        }).compile();

        service = module.get<EnvValidationService>(EnvValidationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateEnvironment', () => {
        it('should pass validation with all required env vars', () => {
            const mockConfigService = createMockConfigService({
                JWT_SECRET: 'a'.repeat(64),
                DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
                REDIS_URL: 'redis://localhost:6379',
                API_URL: 'http://localhost:3000',
                FRONTEND_URL: 'http://localhost:5173',
                NODE_ENV: 'development',
            });

            const module = Test.createTestingModule({
                providers: [
                    EnvValidationService,
                    {
                        provide: ConfigService,
                        useValue: mockConfigService,
                    },
                ],
            }).compile();

            expect(async () => {
                const testService = (await module).get<EnvValidationService>(
                    EnvValidationService,
                );
                testService.validateEnvironment();
            }).not.toThrow();
        });

        it('should throw error if JWT_SECRET is missing', async () => {
            const mockConfigService = createMockConfigService({
                DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
                REDIS_URL: 'redis://localhost:6379',
            });

            const module = await Test.createTestingModule({
                providers: [
                    EnvValidationService,
                    {
                        provide: ConfigService,
                        useValue: mockConfigService,
                    },
                ],
            }).compile();

            const testService = module.get<EnvValidationService>(EnvValidationService);

            expect(() => testService.validateEnvironment()).toThrow(
                'Environment validation failed',
            );
        });

        it('should throw error if JWT_SECRET is too short', async () => {
            const mockConfigService = createMockConfigService({
                JWT_SECRET: 'short',
                DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
                REDIS_URL: 'redis://localhost:6379',
                API_URL: 'http://localhost:3000',
                FRONTEND_URL: 'http://localhost:5173',
            });

            const module = await Test.createTestingModule({
                providers: [
                    EnvValidationService,
                    {
                        provide: ConfigService,
                        useValue: mockConfigService,
                    },
                ],
            }).compile();

            const testService = module.get<EnvValidationService>(EnvValidationService);

            expect(() => testService.validateEnvironment()).toThrow(
                'Environment validation failed',
            );
        });

        it('should throw error if JWT_SECRET is default value', async () => {
            const mockConfigService = createMockConfigService({
                JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production',
                DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
                REDIS_URL: 'redis://localhost:6379',
                API_URL: 'http://localhost:3000',
                FRONTEND_URL: 'http://localhost:5173',
            });

            const module = await Test.createTestingModule({
                providers: [
                    EnvValidationService,
                    {
                        provide: ConfigService,
                        useValue: mockConfigService,
                    },
                ],
            }).compile();

            const testService = module.get<EnvValidationService>(EnvValidationService);

            expect(() => testService.validateEnvironment()).toThrow(
                'Environment validation failed',
            );
        });

        it('should throw error if DATABASE_URL is invalid', async () => {
            const mockConfigService = createMockConfigService({
                JWT_SECRET: 'a'.repeat(64),
                DATABASE_URL: 'mysql://invalid',
                REDIS_URL: 'redis://localhost:6379',
                API_URL: 'http://localhost:3000',
                FRONTEND_URL: 'http://localhost:5173',
            });

            const module = await Test.createTestingModule({
                providers: [
                    EnvValidationService,
                    {
                        provide: ConfigService,
                        useValue: mockConfigService,
                    },
                ],
            }).compile();

            const testService = module.get<EnvValidationService>(EnvValidationService);

            expect(() => testService.validateEnvironment()).toThrow(
                'Environment validation failed',
            );
        });

        it('should validate OpenPay config in production', async () => {
            const mockConfigService = createMockConfigService({
                NODE_ENV: 'production',
                JWT_SECRET: 'a'.repeat(64),
                DATABASE_URL: 'postgresql://user:pass@prod-db.example.com:5432/db',
                REDIS_URL: 'redis://localhost:6379',
                API_URL: 'https://api.monomarket.com',
                FRONTEND_URL: 'https://monomarket.com',
                OPENPAY_MERCHANT_ID: 'merchant123',
                OPENPAY_API_KEY: 'sk_real_key',
                OPENPAY_SANDBOX: 'false',
            });

            const module = await Test.createTestingModule({
                providers: [
                    EnvValidationService,
                    {
                        provide: ConfigService,
                        useValue: mockConfigService,
                    },
                ],
            }).compile();

            const testService = module.get<EnvValidationService>(EnvValidationService);

            expect(() => testService.validateEnvironment()).not.toThrow();
        });

        it('should throw error if DATABASE_URL points to localhost in production', async () => {
            const mockConfigService = createMockConfigService({
                NODE_ENV: 'production',
                JWT_SECRET: 'a'.repeat(64),
                DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
                REDIS_URL: 'redis://localhost:6379',
                API_URL: 'https://api.monomarket.com',
                FRONTEND_URL: 'https://monomarket.com',
                OPENPAY_MERCHANT_ID: 'merchant123',
                OPENPAY_API_KEY: 'sk_real_key',
                OPENPAY_SANDBOX: 'false',
            });

            const module = await Test.createTestingModule({
                providers: [
                    EnvValidationService,
                    {
                        provide: ConfigService,
                        useValue: mockConfigService,
                    },
                ],
            }).compile();

            const testService = module.get<EnvValidationService>(EnvValidationService);

            expect(() => testService.validateEnvironment()).toThrow(
                'Environment validation failed',
            );
        });
    });
});
