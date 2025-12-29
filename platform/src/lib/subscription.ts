import { prisma } from "./prisma";
import { Plan, SubscriptionStatus, NotificationType } from "@prisma/client";
import { PRICING_PLANS } from "@/constants/pricing";

/**
 * Plan Mapping and Quota Logic
 */
export async function syncUserSubscription(
    userIdOrEmail: string,
    plan: Plan,
    stripeCustomerId: string | null,
    stripeSubscriptionId: string | null,
    stripePriceId?: string | null
) {
    // 1. Find user (case-insensitive email or ID)
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { id: userIdOrEmail },
                { email: { equals: userIdOrEmail.toLowerCase().trim(), mode: 'insensitive' } }
            ]
        }
    });

    if (!user) {
        console.error(`❌ Sync failed: User not found for ${userIdOrEmail}`);
        return null;
    }

    console.log(`📡 Synchronizing subscription for ${user.email} to ${plan}...`);

    // 2. Map plan to scan limits from constants
    const scanLimit = plan === Plan.ENTERPRISE
        ? PRICING_PLANS.ENTERPRISE.maxScans
        : plan === Plan.PRO
            ? PRICING_PLANS.PRO.maxScans
            : PRICING_PLANS.FREE.maxScans;

    // 3. Update User model
    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            plan,
            stripeCustomerId,
            stripeSubscriptionId,
        },
    });

    // 4. Update or Create Subscription model
    const subscription = await prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
            plan,
            status: plan === Plan.FREE && !stripeSubscriptionId ? SubscriptionStatus.CANCELED : SubscriptionStatus.ACTIVE,
            stripeSubscriptionId,
            stripeCustomerId,
            stripePriceId: stripePriceId || null,
            monthlyScansLimit: scanLimit,
            canceledAt: plan === Plan.FREE ? new Date() : null,
        },
        create: {
            userId: user.id,
            plan,
            status: SubscriptionStatus.ACTIVE,
            stripeSubscriptionId,
            stripeCustomerId,
            stripePriceId: stripePriceId || null,
            monthlyScansLimit: scanLimit,
            monthlyScansUsed: 0,
            lastResetAt: new Date(),
        }
    });

    // 5. Create notification for the user
    try {
        await prisma.notification.create({
            data: {
                userId: user.id,
                type: plan === Plan.FREE ? NotificationType.SUBSCRIPTION_CANCELED : NotificationType.SUBSCRIPTION_RENEWED,
                title: plan === Plan.FREE ? "Subscription Updated" : `Upgraded to ${plan} Plan!`,
                message: plan === Plan.FREE
                    ? "Your subscription has been updated. You are now on the FREE plan."
                    : `Your plan has been upgraded to ${plan}. You now have ${scanLimit === -1 ? 'unlimited' : scanLimit} scans per month.`,
                actionUrl: "/dashboard",
                actionLabel: "View Dashboard"
            }
        });
    } catch (e) {
        console.error("Failed to create notification:", e);
    }

    return { user: updatedUser, subscription };
}

/**
 * Map Stripe Price ID to Plan
 */
export function getPlanFromPriceId(priceId: string | null): Plan {
    if (!priceId) return Plan.FREE;

    if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
        return Plan.PRO;
    }

    if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
        return Plan.ENTERPRISE;
    }

    return Plan.FREE;
}

/**
 * Reset Monthly Quotas if needed
 */
export async function checkAndResetQuota(userId: string) {
    const subscription = await prisma.subscription.findUnique({
        where: { userId }
    });

    if (!subscription) return;

    const now = new Date();
    const lastReset = new Date(subscription.lastResetAt);

    // Check if a month has passed
    const isNewMonth =
        now.getFullYear() > lastReset.getFullYear() ||
        (now.getFullYear() === lastReset.getFullYear() && now.getMonth() > lastReset.getMonth());

    if (isNewMonth) {
        await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                monthlyScansUsed: 0,
                lastResetAt: now,
            }
        });
    }
}
