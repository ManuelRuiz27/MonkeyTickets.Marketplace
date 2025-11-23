import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api');
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/api/auth/register (POST)', () => {
        const uniqueEmail = `test-${Date.now()}@example.com`;

        it('debe registrar un nuevo organizador', () => {
            return request(app.getHttpServer())
                .post('/api/auth/register')
                .send({
                    email: uniqueEmail,
                    password: 'password123',
                    name: 'Test User',
                    businessName: 'Test Business',
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('user');
                    expect(res.body).toHaveProperty('token');
                    expect(res.body.user.email).toBe(uniqueEmail);
                    expect(res.body.user).not.toHaveProperty('password');
                });
        });

        it('debe rechazar registro con email inválido', () => {
            return request(app.getHttpServer())
                .post('/api/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'password123',
                    name: 'Test User',
                    businessName: 'Test Business',
                })
                .expect(400);
        });

        it('debe rechazar registro con contraseña corta', () => {
            return request(app.getHttpServer())
                .post('/api/auth/register')
                .send({
                    email: 'test2@example.com',
                    password: 'short',
                    name: 'Test User',
                    businessName: 'Test Business',
                })
                .expect(400);
        });

        it('debe rechazar registro con campos faltantes', () => {
            return request(app.getHttpServer())
                .post('/api/auth/register')
                .send({
                    email: 'test3@example.com',
                    password: 'password123',
                    // Falta name y business Name
                })
                .expect(400);
        });
    });

    describe('/api/auth/login (POST)', () => {
        it('debe hacer login con credenciales válidas', async () => {
            // Usar las credenciales del seed
            const response = await request(app.getHttpServer())
                .post('/api/auth/login')
                .send({
                    email: 'eventos@musiclive.mx',
                    password: 'password123',
                })
                .expect(200);

            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('token');
            expect(response.body.user.email).toBe('eventos@musiclive.mx');
        });

        it('debe rechazar login con credenciales inválidas', () => {
            return request(app.getHttpServer())
                .post('/api/auth/login')
                .send({
                    email: 'wrong@example.com',
                    password: 'wrongpassword',
                })
                .expect(401);
        });

        it('debe rechazar login con contraseña incorrecta', () => {
            return request(app.getHttpServer())
                .post('/api/auth/login')
                .send({
                    email: 'eventos@musiclive.mx',
                    password: 'wrongpassword',
                })
                .expect(401);
        });
    });
});
