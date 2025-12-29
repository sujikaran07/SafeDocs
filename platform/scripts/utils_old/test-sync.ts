import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/stripe/sync/route';

// This is a test script to verify the sync logic for a specific user
// We'll mock the 'getCurrentUser' part by injecting a fixed email if we can
// Actually, let's just make a script that runs the logic directly.

import { PrismaClient } from '@prisma/client';
import { stripe } from '../src/lib/stripe';

const prisma = new PrismaClient();

async function testSync(email: string) {
    console.log(`📡 Manually testing sync for: ${email}`);

    const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }
    });

    if (!user || !user.stripeCustomerId) {
        console.log('❌ User or Customer ID missing.');
        return;
    }

    const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'active',
        limit: 1
    });

    if (subscriptions.data.length === 0) {
        console.log('ℹ️ No active Stripe subscription found for this customer.');
        return;
    }

    const sub = subscriptions.data[0];
    const priceId = sub.items.data[0].price.id;

    console.log(`✅ Found active Stripe subscription: ${sub.id}`);
    console.log(`Price ID: ${priceId}`);

    // Update logic
    let plan: 'PRO' | 'ENTERPRISE' | 'FREE' = 'PRO';
    if (process.env.STRIPE_ENTERPRISE_PRICE_ID && priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
        plan = 'ENTERPRISE';
    } else if (process.env.STRIPE_PRO_PRICE_ID && priceId === process.env.STRIPE_PRO_PRICE_ID) {
        plan = 'PRO';
    }

    console.log(`Expected Plan: ${plan}`);

    if (user.plan !== plan) {
        console.log(`🛠️ SYNCING DB: ${user.plan} -> ${plan}`);
        await prisma.user.update({
            where: { id: user.id },
            data: { plan, stripeSubscriptionId: sub.id }
        });
        console.log('✅ Done.');
    } else {
        console.log('✅ Already in sync.');
    }
}

testSync('safedocs45@gmail.com').catch(console.error);
