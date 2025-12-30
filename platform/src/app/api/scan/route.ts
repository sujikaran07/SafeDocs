import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";
import axios from "axios";
import crypto from "crypto";
import NodeFormData from "form-data";

// Python Engine URL - Sanitize possible quotes from ENV dashboard
const rawEngineUrl = process.env.ENGINE_URL || "http://localhost:8000";
const ENGINE_URL = rawEngineUrl.replace(/^["'](.+)["']$/, '$1');

if (process.env.NODE_ENV === "production" || process.env.DEBUG_SCAN) {
    console.log('--- Scan API Diagnostics ---');
    console.log('ENGINE_URL:', ENGINE_URL);
    console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
    if (process.env.DATABASE_URL?.startsWith('"') || process.env.DATABASE_URL?.endsWith('"')) {
        console.warn('⚠️ WARNING: DATABASE_URL contains quotes. This often causes Prisma to fail.');
    }
}

export async function POST(req: Request) {
    try {
        // 1. Auth Check - Identify who is scanning
        const user = await getCurrentUser();
        if (!user) {
            console.error("❌ Scan failed: Unauthorized");
            return NextResponse.json({ detail: "Unauthorized - please log in again", step: "auth_check" }, { status: 401 });
        }

        // 2. Database Connection Test - Ensure DB is reachable
        try {
            await prisma.$connect();
        } catch (dbErr: any) {
            console.error("❌ Database Connection Failed:", dbErr.message);
            return NextResponse.json({
                detail: "Could not connect to database",
                message: dbErr.message,
                step: "database_connection"
            }, { status: 500 });
        }

        // 3. Request Data Parsing
        let file: File;
        let buffer: Buffer;
        let filename: string;
        try {
            const formData = await req.formData();
            file = formData.get("file") as File;
            if (!file) throw new Error("No file in form data");
            buffer = Buffer.from(await file.arrayBuffer());
            filename = file.name;
        } catch (parseErr: any) {
            console.error("❌ Request Parsing Failed:", parseErr.message);
            return NextResponse.json({
                detail: "Failed to process uploaded file",
                message: parseErr.message,
                step: "request_parsing"
            }, { status: 400 });
        }

        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

        // 4. File Storage (EROFS Prevention)
        let storageDir: string;
        let uploadsDir: string;
        let originalPath: string;
        try {
            const isReadOnlyEnv =
                process.env.NODE_ENV === "production" ||
                process.cwd().includes('/var/task') ||
                process.cwd().includes('/app') ||
                !!process.env.RAILWAY_ENVIRONMENT;

            storageDir = process.env.STORAGE_PATH ||
                (isReadOnlyEnv ? path.join(os.tmpdir(), "safedocs-storage") : path.join(process.cwd(), "storage"));

            uploadsDir = path.join(storageDir, "uploads");
            await mkdir(uploadsDir, { recursive: true });
            originalPath = path.join(uploadsDir, `${sha256}_${filename}`);
            await writeFile(originalPath, buffer);
            console.log(`📂 File saved to temporary storage: ${originalPath}`);
        } catch (fsErr: any) {
            console.error("❌ File Storage Failed:", fsErr.message);
            return NextResponse.json({
                detail: "Failed to write temporary file (Storage Error)",
                message: fsErr.message,
                step: "file_storage"
            }, { status: 500 });
        }

        // 5. Engine Communication
        console.log(`🚀 Contacting AI Engine: ${ENGINE_URL}/scan`);
        let result: any;
        try {
            const form = new NodeFormData();
            form.append("file", buffer, { filename, contentType: file.type || "application/octet-stream" });

            const response = await axios.post(`${ENGINE_URL}/scan`, form, {
                headers: { ...form.getHeaders() },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 45000, // 45s for large files
            });
            result = response.data;
            console.log("✅ Engine response received");
        } catch (engineErr: any) {
            console.error("❌ Engine Communication Failed:", engineErr.message);
            return NextResponse.json({
                detail: "AI Engine did not respond",
                message: engineErr.message,
                engine_url: ENGINE_URL,
                step: "engine_communication"
            }, { status: 500 });
        }

        // 6. Handle Clean File
        let cleanPath = null;
        try {
            if (result.clean_file_b64) {
                const cleanDir = path.join(storageDir, "clean");
                await mkdir(cleanDir, { recursive: true });
                const cleanBuffer = Buffer.from(result.clean_file_b64, 'hex');
                const cleanFilename = `${result.clean_sha256}_clean_${filename}`;
                cleanPath = path.join(cleanDir, cleanFilename);
                await writeFile(cleanPath, cleanBuffer);
                delete result.clean_file_b64;
            }
        } catch (cleanFsErr: any) {
            console.warn("⚠️ Clean file storage failed (non-critical):", cleanFsErr.message);
        }

        // 7. Database Save
        try {
            const scan = await prisma.scan.create({
                data: {
                    userId: user.id,
                    filename: result.filename || filename,
                    cleanFilename: result.clean_filename || (cleanPath ? path.basename(cleanPath) : null),
                    verdict: (result.verdict || "error").toUpperCase(),
                    riskScore: result.risk_score || 0,
                    originalPath,
                    cleanPath,
                    sizeBytes: result.size || buffer.length,
                    sha256: result.sha256 || sha256,
                    contentType: result.content_type || file.type,
                    report: result as any,
                },
            });

            return NextResponse.json({
                scan_id: scan.id,
                report_id: scan.id,
                filename: scan.filename,
                verdict: scan.verdict,
                risk_score: scan.riskScore,
                findings: result.findings || [],
                meta: result.meta || {
                    file: scan.filename,
                    size_bytes: scan.sizeBytes,
                    sha256: scan.sha256,
                },
                sanitized: !!cleanPath,
                download_api: scan.cleanPath ? `/api/download/${scan.id}` : null,
                report_api: `/api/report/${scan.id}`,
            });
        } catch (dbSaveErr: any) {
            console.error("❌ Database Save Failed:", dbSaveErr.message);
            return NextResponse.json({
                detail: "Failed to save scan results to database",
                message: dbSaveErr.message,
                step: "database_save"
            }, { status: 500 });
        }

    } catch (unexpectedErr: any) {
        console.error("❌ Unexpected Scan Error:", unexpectedErr.message);
        return NextResponse.json({
            detail: "An unexpected error occurred",
            message: unexpectedErr.message,
            step: "unknown"
        }, { status: 500 });
    }
}
