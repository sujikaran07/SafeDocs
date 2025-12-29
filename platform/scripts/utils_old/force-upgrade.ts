import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'tamilveeran20070907@gmail.com';
    console.log(`🛠️ Forcing upgrade for ${email}...`);

    try {
        const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } }
        });

        if (!user) {
            console.error('❌ User not found in database.');
            return;
        }

        console.log(`Found user ID: ${user.id}`);

        // Update User
        await prisma.user.update({
            where: { id: user.id },
            data: {
                plan: 'ENTERPRISE',
                stripeCustomerId: user.stripeCustomerId || 'manual_upgrade_customer',
                stripeSubscriptionId: user.stripeSubscriptionId || 'manual_upgrade_sub'
            }
        });

        // Update/Create Subscription
        await prisma.subscription.upsert({
            where: { userId: user.id },
            update: {
                plan: 'ENTERPRISE',
                status: 'ACTIVE',
                monthlyScansLimit: -1,
                stripeCustomerId: user.stripeCustomerId || 'manual_upgrade_customer',
                stripeSubscriptionId: user.stripeSubscriptionId || 'manual_upgrade_sub'
            },
            create: {
                userId: user.id,
                plan: 'ENTERPRISE',
                status: 'ACTIVE',
                monthlyScansLimit: -1,
                stripeCustomerId: 'manual_upgrade_customer',
                stripeSubscriptionId: 'manual_upgrade_sub'
            }
        });

        console.log('✅ SUCCESS: User plan forced to ENTERPRISE.');
        console.log('Please refresh your dashboard page now.');

    } catch (error) {
        console.error('❌ Error during manual upgrade:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
