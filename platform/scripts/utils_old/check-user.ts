import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'tamilveeran20070907@gmail.com';
    console.log(`Searching for user: ${email}`);

    try {
        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive'
                }
            },
            include: {
                subscription: true
            }
        });

        if (!user) {
            console.log('User not found.');
        } else {
            console.log('User found:', JSON.stringify({
                id: user.id,
                email: user.email,
                plan: user.plan,
                stripeCustomerId: user.stripeCustomerId,
                stripeSubscriptionId: user.stripeSubscriptionId,
                hasSubscriptionRecord: !!user.subscription
            }, null, 2));

            if (user.subscription) {
                console.log('Subscription Record:', JSON.stringify(user.subscription, null, 2));
            }

            // Check for webhook logs
            try {
                const logs = await prisma.webhookLog.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                });
                console.log(`Found ${logs.length} recent webhook logs.`);
            } catch (e) {
                console.log('Could not fetch webhook logs (table might not exist).');
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
