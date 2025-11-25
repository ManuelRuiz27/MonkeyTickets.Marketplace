import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('EventsController (e2e)', () => {
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

    describe('/api/public/events (GET)', () => {
        it('debe retornar lista de eventos públicos', () => {
            return request(app.getHttpServer())
                .get('/api/public/events')
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                });
        });

        it('debe retornar solo eventos con status PUBLISHED', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/public/events')
                .expect(200);

            const events = response.body;
            events.forEach((event: any) => {
                expect(event.status).toBe('PUBLISHED');
            });
        });
    });

    describe('/api/public/events/:id (GET)', () => {
        it('debe retornar un evento específico por ID', async () => {
            // Primero obtenemos la lista para tener un ID válido
            const eventsResponse = await request(app.getHttpServer())
                .get('/api/public/events')
                .expect(200);

            if (eventsResponse.body.length > 0) {
                const eventId = eventsResponse.body[0].id;

                const response = await request(app.getHttpServer())
                    .get(`/api/public/events/${eventId}`)
                    .expect(200);

                expect(response.body).toHaveProperty('id', eventId);
                expect(response.body).toHaveProperty('title');
                expect(response.body).toHaveProperty('description');
            }
        });

        it('debe retornar 404 para evento inexistente', () => {
            return request(app.getHttpServer())
                .get('/api/public/events/nonexistent-id-12345')
                .expect(404);
        });
    });
});
