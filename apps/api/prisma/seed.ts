import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    const [userCount, eventCount, orderCount, feePlanCount] = await prisma.$transaction([
        prisma.user.count(),
        prisma.event.count(),
        prisma.order.count(),
        prisma.feePlan.count(),
    ]);

    if (userCount + eventCount + orderCount + feePlanCount > 0) {
        console.log('🗑️  Database is not empty. Skipping seed.');
        return;
    }

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.ticket.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.ticketTemplate.deleteMany();
    await prisma.event.deleteMany();
    await prisma.organizer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.feePlan.deleteMany();

    // 1. Create Fee Plans
    console.log('💰 Creating fee plans...');
    const basicPlan = await prisma.feePlan.create({
        data: {
            name: 'Plan Básico',
            description: 'Plan estándar para nuevos organizadores',
            platformFeePercent: 8.5,
            platformFeeFixed: 0,
            paymentGatewayFeePercent: 0,
            complementaryFee: 50,
            isDefault: true,
        },
    });

    const premiumPlan = await prisma.feePlan.create({
        data: {
            name: 'Plan Premium',
            description: 'Plan con comisiones reducidas',
            platformFeePercent: 5.0,
            platformFeeFixed: 0,
            paymentGatewayFeePercent: 0,
            complementaryFee: 0,
            isDefault: false,
        },
    });

    // 2. Create Users
    console.log('👥 Creating users...');
    const passwordHash = await bcrypt.hash('password123', 10);

    const directorUser = await prisma.user.create({
        data: {
            email: 'director@monomarket.com',
            password: passwordHash,
            role: 'DIRECTOR',
            name: 'Admin MonoMarket',
        },
    });

    const organizerUser1 = await prisma.user.create({
        data: {
            email: 'organizador@eventos.com',
            password: passwordHash,
            role: 'ORGANIZER',
            name: 'Juan Pérez',
        },
    });

    const organizerUser2 = await prisma.user.create({
        data: {
            email: 'maria@conciertos.com',
            password: passwordHash,
            role: 'ORGANIZER',
            name: 'María García',
        },
    });

    const staffUser = await prisma.user.create({
        data: {
            email: 'staff@eventos.com',
            password: passwordHash,
            role: 'STAFF',
            name: 'Carlos López',
        },
    });

    // 3. Create Organizers
    console.log('🎭 Creating organizers...');
    const organizer1 = await prisma.organizer.create({
        data: {
            userId: organizerUser1.id,
            businessName: 'Eventos Premium MX',
            status: 'ACTIVE',
            feePlanId: basicPlan.id,
        },
    });

    const organizer2 = await prisma.organizer.create({
        data: {
            userId: organizerUser2.id,
            businessName: 'Conciertos Elite',
            status: 'ACTIVE',
            feePlanId: premiumPlan.id,
        },
    });

    // 4. Create Events
    console.log('🎫 Creating events...');
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const event1 = await prisma.event.create({
        data: {
            title: 'Concierto Rock en Vivo - The Legends',
            description: 'Una noche inolvidable con las mejores bandas de rock de México',
            category: 'MUSIC',
            startDate: nextWeek,
            endDate: new Date(nextWeek.getTime() + 4 * 60 * 60 * 1000),
            venue: 'Foro Sol',
            address: 'Viaducto Río de la Piedad s/n, Ciudad de México',
            city: 'Ciudad de México',
            capacity: 500,
            price: 500,
            maxTicketsPerPurchase: 10,
            status: 'PUBLISHED',
            isPublic: true,
            isUnlisted: false,
            organizerId: organizer1.id,
            coverImage: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea',
        },
    });

    const event2 = await prisma.event.create({
        data: {
            title: 'Festival de Jazz 2024',
            description: 'El mejor jazz en vivo con artistas internacionales',
            category: 'MUSIC',
            startDate: nextMonth,
            endDate: new Date(nextMonth.getTime() + 6 * 60 * 60 * 1000),
            venue: 'Teatro Metropolitan',
            address: 'Av. Independencia 90, Centro, CDMX',
            city: 'Ciudad de México',
            capacity: 300,
            price: 800,
            maxTicketsPerPurchase: 6,
            status: 'PUBLISHED',
            isPublic: true,
            isUnlisted: false,
            organizerId: organizer2.id,
            coverImage: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f',
        },
    });

    const event3 = await prisma.event.create({
        data: {
            title: 'Evento Privado VIP - Cena de Gala',
            description: 'Evento exclusivo por invitación',
            category: 'OTHER',
            startDate: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000),
            endDate: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
            venue: 'Hotel St. Regis',
            address: 'Paseo de la Reforma 439, CDMX',
            city: 'Ciudad de México',
            capacity: 50,
            price: 3000,
            maxTicketsPerPurchase: 4,
            status: 'PUBLISHED',
            isPublic: false,
            isUnlisted: true,
            accessToken: 'vip-gala-2024-exclusive',
            organizerId: organizer1.id,
        },
    });

    // 5. Create Ticket Templates
    console.log('🎟️ Creating ticket templates...');

    const template1General = await prisma.ticketTemplate.create({
        data: {
            organizerId: organizer1.id,
            eventId: event1.id,
            name: 'General',
            description: 'Acceso general al evento',
            price: 500,
            quantity: 400,
            sold: 75,
        },
    });

    const template1VIP = await prisma.ticketTemplate.create({
        data: {
            organizerId: organizer1.id,
            eventId: event1.id,
            name: 'VIP',
            description: 'Acceso preferente + Meet & Greet',
            price: 1500,
            quantity: 100,
            sold: 30,
        },
    });

    const template2General = await prisma.ticketTemplate.create({
        data: {
            organizerId: organizer2.id,
            eventId: event2.id,
            name: 'General',
            description: 'Entrada general',
            price: 800,
            quantity: 250,
            sold: 120,
        },
    });

    const template3VIP = await prisma.ticketTemplate.create({
        data: {
            organizerId: organizer1.id,
            eventId: event3.id,
            name: 'VIP Exclusivo',
            description: 'Acceso a cena de gala',
            price: 3000,
            quantity: 50,
            sold: 15,
        },
    });

    // 6. Create Sample Orders
    console.log('📦 Creating sample orders...');

    const buyer1 = await prisma.buyer.create({
        data: {
            email: 'cliente1@gmail.com',
            name: 'Pedro Ramírez',
            phone: '5544332211',
        },
    });

    const buyer2 = await prisma.buyer.create({
        data: {
            email: 'ana.lopez@hotmail.com',
            name: 'Ana López',
            phone: '5599887766',
        },
    });

    // Orden 1: PAID
    const order1 = await prisma.order.create({
        data: {
            eventId: event1.id,
            buyerId: buyer1.id,
            total: 1000,
            status: 'PAID',
            platformFeeAmount: 85,
            organizerIncomeAmount: 915,
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            paidAt: new Date(),
        },
    });

    await prisma.orderItem.create({
        data: {
            orderId: order1.id,
            templateId: template1General.id,
            quantity: 2,
            unitPrice: 500,
        },
    });

    // Crear tickets para orden pagada
    await prisma.ticket.createMany({
        data: [
            {
                orderId: order1.id,
                templateId: template1General.id,
                qrCode: 'qr-ticket-1-' + Math.random().toString(36).substring(7),
                status: 'VALID',
            },
            {
                orderId: order1.id,
                templateId: template1General.id,
                qrCode: 'qr-ticket-2-' + Math.random().toString(36).substring(7),
                status: 'VALID',
            },
        ],
    });

    // Orden 2: PAID con ticket usado
    const order2 = await prisma.order.create({
        data: {
            eventId: event1.id,
            buyerId: buyer2.id,
            total: 3000,
            status: 'PAID',
            platformFeeAmount: 150,
            organizerIncomeAmount: 2850,
            ipAddress: '192.168.1.101',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            paidAt: new Date(),
        },
    });

    await prisma.orderItem.create({
        data: {
            orderId: order2.id,
            templateId: template1VIP.id,
            quantity: 2,
            unitPrice: 1500,
        },
    });

    await prisma.ticket.createMany({
        data: [
            {
                orderId: order2.id,
                templateId: template1VIP.id,
                qrCode: 'qr-ticket-3-' + Math.random().toString(36).substring(7),
                status: 'VALID',
            },
            {
                orderId: order2.id,
                templateId: template1VIP.id,
                qrCode: 'qr-ticket-4-' + Math.random().toString(36).substring(7),
                status: 'USED',
                usedAt: new Date(),
            },
        ],
    });

    // 7. Create Email Logs
    console.log('📧 Creating email logs...');
    await prisma.emailLog.createMany({
        data: [
            {
                orderId: order1.id,
                to: buyer1.email,
                subject: `Tus tickets para ${event1.title}`,
                status: 'SENT',
                sentAt: new Date(),
            },
            {
                orderId: order2.id,
                to: buyer2.email,
                subject: `Tus tickets para ${event1.title}`,
                status: 'SENT',
                sentAt: new Date(),
            },
        ],
    });

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Director:');
    console.log('  Email: director@monomarket.com');
    console.log('  Password: password123');
    console.log('\nOrganizador 1:');
    console.log('  Email: organizador@eventos.com');
    console.log('  Password: password123');
    console.log('  Business: Eventos Premium MX');
    console.log('\nOrganizador 2:');
    console.log('  Email: maria@conciertos.com');
    console.log('  Password: password123');
    console.log('  Business: Conciertos Elite');
    console.log('\nStaff:');
    console.log('  Email: staff@eventos.com');
    console.log('  Password: password123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Data Summary:');
    console.log(`  - Users: 4 (1 Director, 2 Organizers, 1 Staff)`);
    console.log(`  - Organizers: 2`);
    console.log(`  - Events: 3 (2 public, 1 unlisted)`);
    console.log(`  - Ticket Templates: 4`);
    console.log(`  - Orders: 2 (both paid)`);
    console.log(`  - Tickets: 4 (3 valid, 1 used)`);
    console.log(`  - Fee Plans: 2`);
    console.log(`\n🔗 Unlisted Event URL:`);
    console.log(`  ${event3.title}: /public/events/unlisted/${event3.accessToken}`);
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
