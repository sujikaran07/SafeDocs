import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";
import mime from "mime";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const scan = await prisma.scan.findUnique({ where: { id } });
    if (!scan || scan.userId !== user.id) {
        console.error(`Download failed: Scan ${id} not found or unauthorized`);
        return NextResponse.json({ detail: "Not found" }, { status: 404 });
    }

    if (!scan.cleanPath) {
        console.error(`Download failed: No cleanPath for scan ${id}. Scan data:`, {
            id: scan.id,
            filename: scan.filename,
            verdict: scan.verdict,
            cleanPath: scan.cleanPath,
            cleanFilename: scan.cleanFilename
        });
        return NextResponse.json({ detail: "No clean file available. File may not have been sanitized." }, { status: 404 });
    }

    try {
        console.log(`Attempting to read file: ${scan.cleanPath}`);
        const buffer = await readFile(scan.cleanPath);
        console.log(`Successfully read file: ${scan.cleanPath}, size: ${buffer.length} bytes`);

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": scan.contentType || "application/octet-stream",
                "Content-Disposition": `attachment; filename="${scan.cleanFilename || scan.filename || 'download'}"`
            }
        });
    } catch (e: any) {
        console.error(`File read error for scan ${id}:`, {
            error: e.message,
            cleanPath: scan.cleanPath,
            fileExists: e.code === 'ENOENT' ? 'File does not exist' : 'Other error'
        });
        return NextResponse.json({
            detail: "File missing or expired. It may have been cleaned up.",
            path: scan.cleanPath
        }, { status: 404 });
    }
}
