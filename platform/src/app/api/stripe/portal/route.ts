import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/stripe/portal
 * Creates a Stripe Customer Portal session for subscription management
 * This allows users to:
 * - Cancel their subscription
 * - Update payment method
 * - View invoices
 * - Download receipts
 */
export async function POST(req: NextRequest) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: currentUser.email },
            select: { stripeCustomerId: true }
        });

        if (!user?.stripeCustomerId) {
            return NextResponse.json(
                { error: 'No subscription found. Please upgrade to a paid plan first.' },
                { status: 404 }
            );
        }

        // Create a portal session to manage subscriptions
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        });

        return NextResponse.json({
            url: portalSession.url,
            message: 'Redirecting to customer portal...'
        });

    } catch (error: any) {
        console.error('Portal creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create portal session' },
            { status: 500 }
        );
    }
}
