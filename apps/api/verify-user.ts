import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'eventos@musiclive.mx';
    const password = 'password123';

    console.log(`Checking user: ${email}`);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.error('User not found!');
        return;
    }

    console.log('User found:', user.id, user.email);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`Password match for '${password}': ${isMatch}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
