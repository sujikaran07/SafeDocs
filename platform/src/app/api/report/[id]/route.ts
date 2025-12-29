import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    // Next.js 15+: params is now a Promise
    const { id } = await params;

    const scan = await prisma.scan.findUnique({ where: { id } });
    if (!scan || scan.userId !== user.id) {
        return NextResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return NextResponse.json(scan.report || { error: "No report data" });
}
