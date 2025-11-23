import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...');

    // Limpiar datos existentes (opcional - cuidado en producción)
    console.log('🧹 Limpiando datos existentes...');
    await prisma.ticket.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.ticketTemplate.deleteMany();
    await prisma.event.deleteMany();
    await prisma.organizer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.feePlan.deleteMany();
    await prisma.buyer.deleteMany();

    // Crear plan de fees por defecto
    console.log('💰 Creando plan de fees...');
    const defaultFeePlan = await prisma.feePlan.create({
        data: {
            name: 'Plan Estándar',
            description: 'Plan de comisiones estándar para organizadores',
            platformFeePercent: 5.0,
            platformFeeFixed: 10.0,
            paymentGatewayFeePercent: 3.6,
            isDefault: true,
        },
    });

    // Crear usuarios organizadores
    console.log('👥 Creando usuarios...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user1 = await prisma.user.create({
        data: {
            email: 'eventos@musiclive.mx',
            password: hashedPassword,
            name: 'Carlos Méndez',
            role: 'ORGANIZER',
            organizer: {
                create: {
                    businessName: 'Music Live México',
                    status: 'ACTIVE',
                    feePlanId: defaultFeePlan.id,
                },
            },
        },
        include: {
            organizer: true,
        },
    });

    const user2 = await prisma.user.create({
        data: {
            email: 'info@eventosgdl.com',
            password: hashedPassword,
            name: 'Ana Rodríguez',
            role: 'ORGANIZER',
            organizer: {
                create: {
                    businessName: 'Eventos Guadalajara',
                    status: 'ACTIVE',
                    feePlanId: defaultFeePlan.id,
                },
            },
        },
        include: {
            organizer: true,
        },
    });

    const user3 = await prisma.user.create({
        data: {
            email: 'admin@monomarket.mx',
            password: hashedPassword,
            name: 'Director General',
            role: 'DIRECTOR',
        },
    });

    // Crear eventos
    console.log('🎉 Creando eventos...');

    // Helper para crear fechas futuras
    const futureDate = (daysFromNow: number, hour: number = 18, minute: number = 0) => {
        const date = new Date();
        date.setDate(date.getDate() + daysFromNow);
        date.setHours(hour, minute, 0, 0);
        return date;
    };

    const event1 = await prisma.event.create({
        data: {
            organizerId: user1.organizer!.id,
            title: 'Festival de Rock 2024',
            description:
                'El mejor festival de rock del año con bandas nacionales e internacionales. Una experiencia inolvidable con 3 escenarios y más de 20 artistas en vivo.',
            category: 'Música',
            venue: 'Auditorio Telmex',
            address: 'Av. Mariano Otero 1499',
            city: 'Guadalajara, Jalisco',
            startDate: futureDate(30, 18, 0),  // 30 días desde hoy a las 6pm
            endDate: futureDate(31, 2, 0),     // Termina a las 2am del día siguiente
            coverImage: 'https://images.unsplash.com/photo-1501612780327-45045538702b',
            status: 'PUBLISHED',
        },
    });

    const event2 = await prisma.event.create({
        data: {
            organizerId: user1.organizer!.id,
            title: 'Concierto Electrónico - Tiësto',
            description:
                'Una noche épica con el legendario DJ Tiësto. Música electrónica de primer nivel con producción visual espectacular.',
            category: 'Música',
            venue: 'Arena Monterrey',
            address: 'Av. Francisco I. Madero 2500',
            city: 'Monterrey, Nuevo León',
            startDate: futureDate(45, 21, 0),  // 45 días desde hoy a las 9pm
            endDate: futureDate(46, 4, 0),     // Termina a las 4am
            coverImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3',
            status: 'PUBLISHED',
        },
    });

    const event3 = await prisma.event.create({
        data: {
            organizerId: user1.organizer!.id,
            title: 'Expo Emprendedores 2024',
            description:
                'La feria de emprendimiento más grande de México. Networking, conferencias magistrales y exposición de productos innovadores.',
            category: 'Negocios',
            venue: 'Expo Guadalajara',
            address: 'Av. Mariano Otero 1499',
            city: 'Guadalajara, Jalisco',
            startDate: futureDate(60, 9, 0),   // 60 días desde hoy a las 9am
            endDate: futureDate(62, 20, 0),    // 3 días del evento
            coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
            status: 'PUBLISHED',
        },
    });

    const event4 = await prisma.event.create({
        data: {
            organizerId: user1.organizer!.id,
            title: 'Stand Up Comedy - Franco Escamilla',
            description:
                'Una noche llena de risas con Franco Escamilla. El comediante mexicano más popular del momento presenta su nuevo show.',
            category: 'Comedia',
            venue: 'Teatro Diana',
            address: 'Av. 16 de Septiembre 710',
            city: 'Guadalajara, Jalisco',
            startDate: futureDate(75, 20, 0),  // 75 días desde hoy a las 8pm
            endDate: futureDate(75, 22, 30),   // Termina a las 10:30pm
            coverImage: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca',
            status: 'PUBLISHED',
        },
    });

    const event5 = await prisma.event.create({
        data: {
            organizerId: user1.organizer!.id,
            title: 'Maratón CDMX 2024',
            description:
                'Participa en el maratón más importante de la Ciudad de México. 42km recorriendo los lugares más emblemáticos de la capital.',
            category: 'Deportes',
            venue: 'Zócalo de la CDMX',
            address: 'Plaza de la Constitución S/N',
            city: 'Ciudad de México',
            startDate: futureDate(90, 7, 0),   // 90 días desde hoy a las 7am
            endDate: futureDate(90, 14, 0),    // Termina a las 2pm
            coverImage: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38',
            status: 'PUBLISHED',
        },
    });

    // Crear plantillas de tickets para los eventos
    console.log('🎫 Creando plantillas de tickets...');

    // Evento 1 - Festival de Rock
    await prisma.ticketTemplate.createMany({
        data: [
            {
                organizerId: user1.organizer!.id,
                eventId: event1.id,
                name: 'Pase General',
                description: 'Acceso a los 3 escenarios, zona de pie',
                price: 850,
                currency: 'MXN',
                quantity: 5000,
                sold: 1234,
            },
            {
                organizerId: user1.organizer!.id,
                eventId: event1.id,
                name: 'VIP',
                description: 'Zona VIP con asientos, barra libre y área exclusiva',
                price: 2500,
                currency: 'MXN',
                quantity: 500,
                sold: 342,
            },
            {
                organizerId: user1.organizer!.id,
                eventId: event1.id,
                name: 'Platinum',
                description: 'Acceso backstage, meet & greet con artistas, zona premium',
                price: 5000,
                currency: 'MXN',
                quantity: 100,
                sold: 67,
            },
        ],
    });

    // Evento 2 - Tiësto
    await prisma.ticketTemplate.createMany({
        data: [
            {
                organizerId: user1.organizer!.id,
                eventId: event2.id,
                name: 'General',
                description: 'Acceso general a la arena',
                price: 1200,
                currency: 'MXN',
                quantity: 8000,
                sold: 5432,
            },
            {
                organizerId: user1.organizer!.id,
                eventId: event2.id,
                name: 'VIP Front Stage',
                description: 'Zona VIP frente al escenario, barra libre',
                price: 3500,
                currency: 'MXN',
                quantity: 300,
                sold: 287,
            },
        ],
    });

    // Evento 3 - Expo Emprendedores
    await prisma.ticketTemplate.createMany({
        data: [
            {
                organizerId: user2.organizer!.id,
                eventId: event3.id,
                name: 'Pase 1 Día',
                description: 'Acceso por 1 día a todas las conferencias y expo',
                price: 350,
                currency: 'MXN',
                quantity: 2000,
                sold: 876,
            },
            {
                organizerId: user2.organizer!.id,
                eventId: event3.id,
                name: 'Pase 3 Días',
                description: 'Acceso completo durante los 3 días del evento',
                price: 850,
                currency: 'MXN',
                quantity: 1000,
                sold: 654,
            },
        ],
    });

    // Evento 4 - Franco Escamilla
    await prisma.ticketTemplate.createMany({
        data: [
            {
                organizerId: user2.organizer!.id,
                eventId: event4.id,
                name: 'Luneta',
                description: 'Asientos en luneta, excelente vista',
                price: 650,
                currency: 'MXN',
                quantity: 800,
                sold: 765,
            },
            {
                organizerId: user2.organizer!.id,
                eventId: event4.id,
                name: 'Palco',
                description: 'Palco privado para 4 personas',
                price: 3200,
                currency: 'MXN',
                quantity: 20,
                sold: 18,
            },
        ],
    });

    // Evento 5 - Maratón
    await prisma.ticketTemplate.createMany({
        data: [
            {
                organizerId: user1.organizer!.id,
                eventId: event5.id,
                name: 'Inscripción Maratón 42K',
                description: 'Inscripción completa con kit de corredor y medalla',
                price: 550,
                currency: 'MXN',
                quantity: 15000,
                sold: 8934,
            },
            {
                organizerId: user1.organizer!.id,
                eventId: event5.id,
                name: 'Inscripción Medio Maratón 21K',
                description: 'Media maratón con kit de corredor',
                price: 400,
                currency: 'MXN',
                quantity: 10000,
                sold: 7234,
            },
        ],
    });

    // Crear flujo de compra completo (Buyer -> Order -> Payment -> Tickets)
    console.log('🛍️ Creando flujo de compra de ejemplo...');

    // 1. Crear Comprador
    const buyer = await prisma.buyer.create({
        data: {
            email: 'comprador@ejemplo.com',
            name: 'Juan Pérez',
            phone: '+525512345678',
        },
    });

    // 2. Crear Orden para el Evento 1 (Festival de Rock)
    // Buscamos el template de "Pase General" que creamos antes
    const generalTicketTemplate = await prisma.ticketTemplate.findFirst({
        where: {
            eventId: event1.id,
            name: 'Pase General',
        },
    });

    if (generalTicketTemplate) {
        const ticketQuantity = 2;
        const totalAmount = Number(generalTicketTemplate.price) * ticketQuantity;

        const order = await prisma.order.create({
            data: {
                eventId: event1.id,
                buyerId: buyer.id,
                status: 'PAID',
                total: totalAmount,
                currency: 'MXN',
                paidAt: new Date(),
            },
        });

        // 3. Crear Pago
        await prisma.payment.create({
            data: {
                orderId: order.id,
                gateway: 'CONEKTA',
                amount: totalAmount,
                currency: 'MXN',
                status: 'COMPLETED',
                gatewayTransactionId: 'ord_2tUigJ8923412',
                paymentMethod: 'card',
            },
        });

        // 4. Generar Tickets
        await prisma.ticket.createMany({
            data: [
                {
                    orderId: order.id,
                    templateId: generalTicketTemplate.id,
                    qrCode: `TICKET-${order.id}-1`,
                    status: 'VALID',
                },
                {
                    orderId: order.id,
                    templateId: generalTicketTemplate.id,
                    qrCode: `TICKET-${order.id}-2`,
                    status: 'VALID',
                },
            ],
        });

        // Actualizar contadores
        await prisma.ticketTemplate.update({
            where: { id: generalTicketTemplate.id },
            data: {
                sold: { increment: ticketQuantity },
                quantity: { decrement: ticketQuantity },
            },
        });

        console.log('✅ Compra de ejemplo creada exitosamente');
    }

    // Crear usuarios STAFF para el scanner
    console.log('👨‍💼 Creando usuarios Staff...');

    const staffUser1 = await prisma.user.create({
        data: {
            email: 'scanner1@staff.com',
            password: hashedPassword,
            name: 'Luis Scanner',
            role: 'STAFF',
        },
    });

    const staffUser2 = await prisma.user.create({
        data: {
            email: 'scanner2@staff.com',
            password: hashedPassword,
            name: 'María Puerta',
            role: 'STAFF',
        },
    });

    // Asignar staff a eventos
    await prisma.eventStaff.createMany({
        data: [
            {
                eventId: event1.id,  // Festival de Rock
                userId: staffUser1.id,
                role: 'scanner',
            },
            {
                eventId: event2.id,  // Tiësto
                userId: staffUser1.id,
                role: 'scanner',
            },
            {
                eventId: event1.id,  // Festival de Rock
                userId: staffUser2.id,
                role: 'scanner',
            },
        ],
    });

    console.log('✅ Seed completado exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`  - 3 usuarios creados (2 organizadores, 1 director)`);
    console.log(`  - 2 usuarios STAFF creados`);
    console.log(`  - 5 eventos creados`);
    console.log(`  - 11 plantillas de tickets creadas`);
    console.log(`  - 1 plan de fees creado`);
    console.log(`  - 1 flujo de compra completo creado (Buyer, Order, Payment, 2 Tickets)`);
    console.log(`  - 3 asignaciones de staff a eventos`);
    console.log('\n🔐 Credenciales de prueba:');
    console.log('  Organizador 1:');
    console.log('    Email: eventos@musiclive.mx');
    console.log('    Password: password123');
    console.log('  Organizador 2:');
    console.log('    Email: info@eventosgdl.com');
    console.log('    Password: password123');
    console.log('  Director:');
    console.log('    Email: admin@monomarket.mx');
    console.log('    Password: password123');
    console.log('  \n🎫 STAFF SCANNER (Recomendado para el scanner):');
    console.log('  Staff 1 (acceso a Festival Rock + Tiësto):');
    console.log('    Email: scanner1@staff.com');
    console.log('    Password: password123');
    console.log('  Staff 2 (acceso a Festival Rock):');
    console.log('    Email: scanner2@staff.com');
    console.log('    Password: password123');
}

main()
    .catch((e) => {
        console.error('❌ Error durante el seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
