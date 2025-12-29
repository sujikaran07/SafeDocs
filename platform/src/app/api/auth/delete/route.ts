import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export async function DELETE(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        // Get all user's scans to delete associated files
        const scans = await prisma.scan.findMany({
            where: { userId: user.id },
            select: { originalPath: true, cleanPath: true },
        });

        // Delete all associated files
        for (const scan of scans) {
            try {
                if (scan.originalPath) {
                    await fs.unlink(scan.originalPath).catch(() => { });
                }
                if (scan.cleanPath) {
                    await fs.unlink(scan.cleanPath).catch(() => { });
                }
            } catch (e) {
                // Ignore file deletion errors
                console.error("File deletion error:", e);
            }
        }

        // Delete user (cascade will delete scans, API keys, etc.)
        await prisma.user.delete({
            where: { id: user.id },
        });

        return NextResponse.json({
            ok: true,
            message: "Account deleted successfully",
        });
    } catch (e: any) {
        console.error("Delete account error:", e);
        return NextResponse.json(
            { detail: e.message || "Failed to delete account" },
            { status: 500 }
        );
    }
}
