import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/me
 * Returns current user information from Prisma/PostgreSQL
 */
export async function GET(req: NextRequest) {
    console.log('🔐 /api/auth/me - Getting current user...');

    try {
        const user = await getCurrentUser();

        if (!user) {
            console.log('❌ No user found in token');
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        console.log('🔐 Looking up user in DB:', user.id);

        // Get full user data from PostgreSQL
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                lastLoginAt: true,
            }
        });

        if (!dbUser) {
            console.log('❌ User not found in database');
            return NextResponse.json({ detail: "User not found" }, { status: 404 });
        }

        console.log('✅ User found');

        return NextResponse.json({
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name || "",
            created_at: dbUser.createdAt.toISOString(),
            updated_at: dbUser.createdAt.toISOString(),
            last_login_at: dbUser.lastLoginAt?.toISOString() || null,
        });

    } catch (e: any) {
        console.error("❌ GET /api/auth/me error:", e);
        return NextResponse.json(
            { detail: e.message || "Internal server error" },
            { status: 500 }
        );
    }
}
