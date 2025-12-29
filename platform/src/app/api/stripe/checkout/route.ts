import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICING_PLANS } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        // Get authenticated user
        const currentUser = await getCurrentUser();

        if (!currentUser?.email) {
            return NextResponse.json(
                { error: 'You must be logged in to upgrade your plan' },
                { status: 401 }
            );
        }

        const { plan } = await request.json();

        // Validate plan
        if (!plan || !['PRO', 'ENTERPRISE'].includes(plan)) {
            return NextResponse.json(
                { error: 'Invalid plan selected' },
                { status: 400 }
            );
        }

        const selectedPlan = PRICING_PLANS[plan as 'PRO' | 'ENTERPRISE'];

        // Get user from database
        const email = currentUser.email.toLowerCase().trim();
        // Get user from database - using findFirst for case-insensitivity fallback
        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive'
                }
            },
            select: {
                id: true,
                email: true,
                name: true,
                stripeCustomerId: true
            }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get or create Stripe customer
        let customerId = user.stripeCustomerId;

        if (!customerId) {
            // Create new Stripe customer
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name || undefined,
                metadata: {
                    userId: user.id
                }
            });
            customerId = customer.id;

            // Update user with Stripe customer ID
            await prisma.user.update({
                where: { id: user.id },
                data: { stripeCustomerId: customerId }
            });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: selectedPlan.priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            customer: customerId,
            client_reference_id: user.id,
            subscription_data: {
                metadata: {
                    plan,
                    userId: user.id,
                },
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade-success?plan=${plan}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`,
            metadata: {
                plan,
                userId: user.id,
                userEmail: user.email,
            },
        });

        return NextResponse.json({
            sessionId: session.id,
            url: session.url,
            message: 'Redirecting to secure checkout...'
        });

    } catch (error: any) {
        console.error('Stripe checkout error:', error);
        return NextResponse.json(
            {
                error: error.message || 'Failed to create checkout session',
                details: 'Please try again or contact support if the issue persists.'
            },
            { status: 500 }
        );
    }
}
