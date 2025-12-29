import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { syncUserSubscription, getPlanFromPriceId } from '@/lib/subscription';
import { Plan } from '@prisma/client';

/**
 * POST /api/stripe/sync
 * Manually syncs the subscription status from Stripe to DB.
 */
export async function POST(req: NextRequest) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = currentUser.email.toLowerCase().trim();
        console.log(`📡 Syncing subscription for: ${email}`);

        const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!user.stripeCustomerId) {
            return NextResponse.json({
                synced: false,
                message: 'No Stripe customer ID found. User hasn\'t started checkout.'
            });
        }

        const subscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: 'active',
            limit: 1,
        });

        if (subscriptions.data.length === 0) {
            if (user.plan !== Plan.FREE) {
                console.log(`⚠️ No active subscription found on Stripe. Resetting ${user.email} to FREE.`);
                await syncUserSubscription(user.id, Plan.FREE, user.stripeCustomerId, null);
                return NextResponse.json({ synced: true, plan: Plan.FREE });
            }
            return NextResponse.json({ synced: false, message: 'No active subscription found.' });
        }

        const sub = subscriptions.data[0];
        const priceId = sub.items.data[0].price.id;

        let plan = getPlanFromPriceId(priceId);
        if (sub.metadata?.plan) {
            plan = sub.metadata.plan as Plan;
        }

        if (user.plan !== plan || user.stripeSubscriptionId !== sub.id) {
            console.log(`✅ Mismatch found! Syncing ${user.email} to ${plan}...`);
            await syncUserSubscription(user.id, plan, user.stripeCustomerId, sub.id, priceId);
            return NextResponse.json({ synced: true, plan });
        }

        return NextResponse.json({ synced: true, plan: user.plan, message: 'Already in sync.' });

    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
