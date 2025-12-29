import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'safedocs45@gmail.com';
    console.log(`🔍 Searching for user: ${email}`);

    try {
        const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            include: {
                subscription: true
            }
        });

        if (!user) {
            console.log('❌ User not found.');
            return;
        }

        console.log('✅ User details:');
        console.log(JSON.stringify({
            id: user.id,
            email: user.email,
            plan: user.plan,
            stripeCustomerId: user.stripeCustomerId,
            stripeSubscriptionId: user.stripeSubscriptionId,
            subscription: user.subscription
        }, null, 2));

    } catch (error) {
        console.error('❌ Error details:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
