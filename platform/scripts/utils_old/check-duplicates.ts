import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking for duplicate emails (case-insensitive)...');

    try {
        const users = await prisma.user.findMany({
            select: { email: true, id: true, plan: true }
        });

        const emailMap = new Map();
        const duplicates = [];

        users.forEach(user => {
            const lowerEmail = user.email.toLowerCase().trim();
            if (emailMap.has(lowerEmail)) {
                duplicates.push({
                    email: user.email,
                    previous: emailMap.get(lowerEmail),
                    current: user
                });
            } else {
                emailMap.set(lowerEmail, user);
            }
        });

        if (duplicates.length === 0) {
            console.log('✅ No case-insensitive duplicates found.');
        } else {
            console.log('⚠️ Found duplicates:');
            console.log(JSON.stringify(duplicates, null, 2));
        }

        // Specific check for safedocs45
        const safedocsUsers = users.filter(u => u.email.toLowerCase().includes('safedocs45'));
        console.log('👤 Users matching "safedocs45":', JSON.stringify(safedocsUsers, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
