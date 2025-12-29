import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // Test database connection
        const userCount = await prisma.user.count();

        // Test Prisma connection
        await prisma.$connect();

        return NextResponse.json({
            status: "ok",
            database: "connected",
            userCount: userCount,
            timestamp: new Date().toISOString(),
        });
    } catch (e: any) {
        console.error("Health check error:", e);
        return NextResponse.json(
            {
                status: "error",
                database: "disconnected",
                error: e.message,
                stack: e.stack,
            },
            { status: 500 }
        );
    }
}
