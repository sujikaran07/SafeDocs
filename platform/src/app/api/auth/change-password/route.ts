import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { old_password, new_password } = body;

        if (!old_password || !new_password) {
            return NextResponse.json(
                { detail: "old_password and new_password are required" },
                { status: 400 }
            );
        }

        // Get user from database
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
        });

        if (!dbUser) {
            return NextResponse.json({ detail: "User not found" }, { status: 404 });
        }

        // Verify old password
        const validPassword = await bcrypt.compare(old_password, dbUser.password);
        if (!validPassword) {
            return NextResponse.json(
                { detail: "Current password is incorrect" },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);

        // Update password
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        return NextResponse.json({
            ok: true,
            message: "Password changed successfully",
        });
    } catch (e: any) {
        console.error("Change password error:", e);
        return NextResponse.json(
            { detail: e.message || "Failed to change password" },
            { status: 500 }
        );
    }
}
