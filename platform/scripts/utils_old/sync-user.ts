import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * SYNC USER PLAN
 * Use this script to manually upgrade a user during development
 * Usage: npx tsx scripts/sync-user.ts <email> <PLAN>
 * Example: npx tsx scripts/sync-user.ts test@example.com ENTERPRISE
 */

async function main() {
    const email = process.argv[2]?.toLowerCase().trim();
    const plan = (process.argv[3] || 'PRO').toUpperCase() as 'PRO' | 'ENTERPRISE' | 'FREE';

    if (!email) {
        console.error('❌ Error: Please provide an email address.');
        console.log('Usage: npx tsx scripts/sync-user.ts <email> <PLAN>');
        return;
    }

    console.log(`📡 Syncing ${email} to plan: ${plan}...`);

    try {
        const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } }
        });

        if (!user) {
            console.error(`❌ User not found: ${email}`);
            return;
        }

        // Update User
        await prisma.user.update({
            where: { id: user.id },
            data: {
                plan: plan,
                stripeCustomerId: user.stripeCustomerId || `manual_${Date.now()}`,
                stripeSubscriptionId: plan === 'FREE' ? null : (user.stripeSubscriptionId || `manual_sub_${Date.now()}`)
            }
        });

        // Update/Create Subscription record for scan limits
        const scanLimit = plan === 'ENTERPRISE' ? -1 : (plan === 'PRO' ? 100 : 3);

        await prisma.subscription.upsert({
            where: { userId: user.id },
            update: {
                plan: plan,
                status: plan === 'FREE' ? 'CANCELED' : 'ACTIVE',
                monthlyScansLimit: scanLimit,
            },
            create: {
                userId: user.id,
                plan: plan,
                status: 'ACTIVE',
                monthlyScansLimit: scanLimit,
                stripeCustomerId: `manual_${Date.now()}`,
                stripeSubscriptionId: `manual_sub_${Date.now()}`
            }
        });

        console.log(`✅ SUCCESS: ${email} updated to ${plan}.`);
    } catch (error) {
        console.error('❌ Error syncing user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
