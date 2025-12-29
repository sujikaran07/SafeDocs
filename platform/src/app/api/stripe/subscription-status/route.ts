import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

/**
 * GET /api/stripe/subscription-status
 * Retrieves the current subscription status for the authenticated user
 */
export async function GET(req: NextRequest) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Standardized case-insensitive lookup
        const user = await prisma.user.findFirst({
            where: { email: { equals: currentUser.email.toLowerCase().trim(), mode: 'insensitive' } },
            select: {
                plan: true,
                stripeCustomerId: true,
                stripeSubscriptionId: true
            }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        let subscriptionDetails: any = null;

        if (user.stripeSubscriptionId) {
            try {
                const subscription = await stripe.subscriptions.retrieve(
                    user.stripeSubscriptionId
                );

                subscriptionDetails = {
                    id: subscription.id,
                    status: subscription.status,
                    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
                    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    canceledAt: subscription.canceled_at
                        ? new Date(subscription.canceled_at * 1000).toISOString()
                        : null,
                    trialEnd: subscription.trial_end
                        ? new Date(subscription.trial_end * 1000).toISOString()
                        : null,
                };
            } catch (error) {
                console.error('Error fetching subscription from Stripe:', error);
            }
        }

        return NextResponse.json({
            plan: user.plan,
            hasActiveSubscription: !!user.stripeSubscriptionId,
            subscription: subscriptionDetails,
            message: !user.stripeSubscriptionId
                ? 'No active subscription. You are on the FREE plan.'
                : `Active ${user.plan} subscription`
        });

    } catch (error: any) {
        console.error('Error fetching subscription status:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch subscription' },
            { status: 500 }
        );
    }
}
