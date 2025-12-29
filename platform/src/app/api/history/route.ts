import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/history
 * Returns scan history from Prisma/PostgreSQL
 */
export async function GET(req: NextRequest) {
    console.log('📜 /api/history - Fetching scan history...');

    try {
        const user = await getCurrentUser();

        if (!user) {
            console.log('❌ Unauthorized');
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        console.log('📜 Fetching scans for user:', user.id);

        const scans = await prisma.scan.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
                id: true,
                filename: true,
                createdAt: true,
                verdict: true,
                riskScore: true,
                cleanPath: true,
            }
        });

        console.log('✅ Found', scans.length, 'scans');

        const items = scans.map(s => ({
            scan_id: s.id,
            report_id: s.id,
            filename: s.filename,
            created_at: s.createdAt.toISOString(),
            verdict: s.verdict.toLowerCase(),
            risk_score: s.riskScore,
            report_url: `/api/report/${s.id}`,
            download_clean_url: s.cleanPath ? `/api/download/${s.id}` : null,
        }));

        return NextResponse.json({ items });

    } catch (e: any) {
        console.error("❌ GET /api/history error:", e);
        return NextResponse.json(
            { detail: e.message || "Failed to fetch history" },
            { status: 500 }
        );
    }
}
