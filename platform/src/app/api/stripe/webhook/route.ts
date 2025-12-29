import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { syncUserSubscription, getPlanFromPriceId } from '@/lib/subscription';
import { Plan } from '@prisma/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    console.log(`📡 Incoming Webhook - Signature: ${signature ? 'Present' : 'Missing'}`);

    if (!signature && process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Missing stripe-signature header' },
            { status: 400 }
        );
    }

    let event: Stripe.Event;

    try {
        if (process.env.NODE_ENV !== 'production' && process.env.STRIPE_WEBHOOK_SECRET === 'skip') {
            console.warn('⚠️ Skipping Stripe signature verification');
            event = JSON.parse(body);
        } else {
            event = stripe.webhooks.constructEvent(
                body,
                signature!,
                process.env.STRIPE_WEBHOOK_SECRET!
            );
        }
    } catch (err: any) {
        console.error('❌ Webhook verification failed:', err.message);
        return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 });
    }

    // Log event
    try {
        await prisma.webhookLog.create({
            data: {
                provider: 'stripe',
                event: event.type,
                payload: event as any,
                processed: false
            }
        });
    } catch (logError) {
        console.error('Failed to log webhook:', logError);
    }

    try {
        console.log(`🔔 Received Stripe event: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const customerEmail = (session.customer_email || session.customer_details?.email || session.metadata?.userEmail)?.toLowerCase().trim();
                const userId = session.metadata?.userId;
                const planFromMeta = session.metadata?.plan as Plan;

                console.log(`🔔 Webhook: Processing checkout.session.completed for ${customerEmail}`);

                await syncUserSubscription(
                    userId || customerEmail || "",
                    planFromMeta || Plan.PRO,
                    session.customer as string,
                    session.subscription as string
                );
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const priceId = subscription.items.data[0].price.id;

                let plan = getPlanFromPriceId(priceId);

                if (subscription.metadata?.plan) {
                    plan = subscription.metadata.plan as Plan;
                }

                console.log(`🔔 Webhook: Syncing ${event.type} to ${plan} for customer ${subscription.customer}`);

                let user = await prisma.user.findUnique({
                    where: { stripeCustomerId: subscription.customer as string }
                });

                if (!user) {
                    const customer = await stripe.customers.retrieve(subscription.customer as string);
                    if ('email' in customer && customer.email) {
                        user = await prisma.user.findFirst({
                            where: { email: { equals: customer.email.toLowerCase().trim(), mode: 'insensitive' } }
                        });
                    }
                }

                if (user) {
                    await syncUserSubscription(
                        user.id,
                        plan,
                        subscription.customer as string,
                        subscription.id,
                        priceId
                    );
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                console.log(`🔔 Webhook: Subscription deleted ${subscription.id}`);

                const user = await prisma.user.findUnique({
                    where: { stripeCustomerId: subscription.customer as string }
                });

                if (user && user.stripeSubscriptionId === subscription.id) {
                    await syncUserSubscription(
                        user.id,
                        Plan.FREE,
                        subscription.customer as string,
                        null
                    );
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook handler error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
