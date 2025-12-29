import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const email = currentUser.email.toLowerCase().trim();
        console.log(`👤 Fetching profile for: ${email}`);

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                plan: true,
                stripeCustomerId: true,
                stripeSubscriptionId: true,
                createdAt: true,
            }
        });

        if (!user) {
            console.error(`❌ User not found in DB for email from session: ${email}`);
            return NextResponse.json(
                { error: 'User not found in database. Please log out and back in.' },
                { status: 404 }
            );
        }

        console.log(`✅ Found user record. Plan: ${user.plan}, Subscription: ${user.stripeSubscriptionId || 'None'}`);

        // Get scan count for current month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const scanCount = await prisma.scan.count({
            where: {
                userId: user.id,
                createdAt: {
                    gte: firstDayOfMonth
                }
            }
        });

        // Define limits based on plan
        const limits = {
            FREE: 3,
            PRO: 100,
            ENTERPRISE: -1 // unlimited
        };

        const maxScans = limits[user.plan as keyof typeof limits] || 3;

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                plan: user.plan,
                hasActiveSubscription: !!user.stripeSubscriptionId,
                memberSince: user.createdAt,
            },
            quota: {
                scansUsed: scanCount,
                scansLimit: maxScans,
                scansRemaining: maxScans === -1 ? 'Unlimited' : Math.max(0, maxScans - scanCount),
                isUnlimited: maxScans === -1,
                canScan: maxScans === -1 || scanCount < maxScans,
            }
        });

    } catch (error: any) {
        console.error('Error fetching user profile:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}
