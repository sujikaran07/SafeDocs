import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const upgradedUsers = await prisma.user.findMany({
            where: {
                plan: { not: 'FREE' }
            },
            select: {
                id: true,
                email: true,
                plan: true
            }
        });
        console.log('Upgraded Users:', JSON.stringify(upgradedUsers, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
