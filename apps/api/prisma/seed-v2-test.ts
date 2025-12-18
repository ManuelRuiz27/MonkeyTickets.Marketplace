import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed for V2 testing...\n');

    // 1. Create Test Organizer
    console.log('1️⃣ Creating test organizer...');
    const hashedPassword = await bcrypt.hash('test123', 10);

    const organizer = await prisma.user.upsert({
        where: { email: 'organizer@test.com' },
        update: {},
        create: {
            email: 'organizer@test.com',
            name: 'Test Organizer',
            password: hashedPassword,
            role: 'ORGANIZER',
        },
    });
    console.log(`✅ Organizer created: ${organizer.email}`);

    // 2. Create Test Event
    console.log('\n2️⃣ Creating test event...');
    const event = await prisma.event.upsert({
        where: { id: 'test-event-v2' },
        update: {},
        create: {
            id: 'test-event-v2',
            title: 'V2 Test Event - Nightclub',
            description: 'Event for testing RP System V2',
            startDate: new Date('2025-12-31T22:00:00'),
            endDate: new Date('2026-01-01T04:00:00'),
            venue: 'Test Nightclub',
            address: 'Test Street 123',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            status: 'PUBLISHED',
            organizerId: organizer.id,
            maxCapacity: 500,
            attendanceCount: 0,
        },
    });
    console.log(`✅ Event created: ${event.title} (ID: ${event.id})`);

    // 3. Create RP Users
    console.log('\n3️⃣ Creating RP users...');

    const rp1Password = await bcrypt.hash('rp123', 10);
    const rp1 = await prisma.user.upsert({
        where: { email: 'rp1@test.com' },
        update: {},
        create: {
            email: 'rp1@test.com',
            name: 'Test RP 1',
            password: rp1Password,
            role: 'RP' as any, // Type assertion for RP role
        },
    });

    await prisma.rPProfile.upsert({
        where: { userId: rp1.id },
        update: {},
        create: {
            userId: rp1.id,
            eventId: event.id,
            maxTickets: 50,
            isActive: true,
            ticketsGenerated: 0,
            ticketsUsed: 0,
        },
    });
    console.log(`✅ RP User 1: ${rp1.email} | Password: rp123`);

    const rp2Password = await bcrypt.hash('rp456', 10);
    const rp2 = await prisma.user.upsert({
        where: { email: 'rp2@test.com' },
        update: {},
        create: {
            email: 'rp2@test.com',
            name: 'Test RP 2',
            password: rp2Password,
            role: 'RP' as any,
        },
    });

    await prisma.rPProfile.upsert({
        where: { userId: rp2.id },
        update: {},
        create: {
            userId: rp2.id,
            eventId: event.id,
            maxTickets: 30,
            isActive: true,
            ticketsGenerated: 0,
            ticketsUsed: 0,
        },
    });
    console.log(`✅ RP User 2: ${rp2.email} | Password: rp456`);

    // 4. Create Guest Types
    console.log('\n4️⃣ Creating guest types...');

    const vipType = await prisma.guestType.upsert({
        where: {
            eventId_name: {
                eventId: event.id,
                name: 'VIP'
            }
        },
        update: {},
        create: {
            eventId: event.id,
            name: 'VIP',
            description: 'Very Important Person',
            color: '#FFD700',
            icon: '👑',
            showNicknameOnPdf: true,
            displayOrder: 1,
            ticketCount: 0,
        },
    });
    console.log(`✅ Guest Type: ${vipType.name} (${vipType.color})`);

    const influencerType = await prisma.guestType.upsert({
        where: {
            eventId_name: {
                eventId: event.id,
                name: 'Influencer'
            }
        },
        update: {},
        create: {
            eventId: event.id,
            name: 'Influencer',
            description: 'Social media influencer',
            color: '#FF69B4',
            icon: '🌟',
            showNicknameOnPdf: false,
            displayOrder: 2,
            ticketCount: 0,
        },
    });
    console.log(`✅ Guest Type: ${influencerType.name} (${influencerType.color})`);

    const pressType = await prisma.guestType.upsert({
        where: {
            eventId_name: {
                eventId: event.id,
                name: 'Press'
            }
        },
        update: {},
        create: {
            eventId: event.id,
            name: 'Press',
            description: 'Media and press',
            color: '#10B981',
            icon: '📸',
            showNicknameOnPdf: true,
            displayOrder: 3,
            ticketCount: 0,
        },
    });
    console.log(`✅ Guest Type: ${pressType.name} (${pressType.color})`);

    console.log('\n✨ Seed completed successfully!\n');
    console.log('═'.repeat(60));
    console.log('📋 TEST CREDENTIALS:');
    console.log('═'.repeat(60));
    console.log('\n🔐 ORGANIZER:');
    console.log('   Email: organizer@test.com');
    console.log('   Password: test123');
    console.log('\n🎟️ RP USERS:');
    console.log('   RP 1: rp1@test.com / rp123 (Max: 50 tickets)');
    console.log('   RP 2: rp2@test.com / rp456 (Max: 30 tickets)');
    console.log('\n🎪 EVENT:');
    console.log(`   ID: ${event.id}`);
    console.log(`   Title: ${event.title}`);
    console.log('\n🎨 GUEST TYPES:');
    console.log('   👑 VIP (#FFD700) - Nickname: Yes');
    console.log('   🌟 Influencer (#FF69B4) - Nickname: No');
    console.log('   📸 Press (#10B981) - Nickname: Yes');
    console.log('\n' + '═'.repeat(60));
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
