import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/stats
 * Returns user statistics from Prisma/PostgreSQL
 */
export async function GET(req: NextRequest) {
    console.log('📊 /api/stats - Fetching statistics...');

    try {
        const user = await getCurrentUser();

        if (!user) {
            console.log('❌ Unauthorized');
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        console.log('📊 Calculating stats for user:', user.id);

        const [total, benign, malicious, lastScan] = await Promise.all([
            prisma.scan.count({ where: { userId: user.id } }),
            prisma.scan.count({ where: { userId: user.id, verdict: "BENIGN" } }),
            prisma.scan.count({ where: { userId: user.id, verdict: "MALICIOUS" } }),
            prisma.scan.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                select: { createdAt: true }
            })
        ]);

        console.log('✅ Stats:', { total, benign, malicious });

        return NextResponse.json({
            total_scans: total,
            benign,
            malicious,
            last_activity: lastScan?.createdAt?.toISOString() || null
        });

    } catch (e: any) {
        console.error("❌ GET /api/stats error:", e);
        return NextResponse.json(
            { detail: e.message || "Failed to fetch stats" },
            { status: 500 }
        );
    }
}
