import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";
import axios from "axios";
import crypto from "crypto";
import NodeFormData from "form-data";

// Python Engine URL
const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:8000";

if (process.env.NODE_ENV === "production") {
    console.log('--- Scan API Production Setup ---');
    console.log('ENGINE_URL starts with:', ENGINE_URL?.substring(0, 10));
    console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
    if (process.env.DATABASE_URL?.startsWith('"')) {
        console.error('⚠️ CRITICAL: DATABASE_URL starts with a quote mark! This will break Prisma.');
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error("❌ Scan failed: Unauthorized (no user in session)");
            return NextResponse.json({ detail: "Unauthorized - please log in again" }, { status: 401 });
        }

        // 0. Verify Database Connection
        try {
            await prisma.$connect();
        } catch (dbErr: any) {
            console.error("❌ Scan Failed: Could not connect to database:", dbErr.message);
            return NextResponse.json({
                detail: "Database connectivity issue",
                message: dbErr.message,
                step: "database_connection"
            }, { status: 500 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            console.error("No file found in formData");
            return NextResponse.json({ detail: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = file.name;
        const size = buffer.length;

        console.log(`File received: ${filename}, Size: ${size} bytes`);
        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

        // 1. Save original to disk
        const isReadOnlyEnv =
            process.env.NODE_ENV === "production" ||
            process.cwd().includes('/var/task') ||
            process.cwd().includes('/app') ||
            !!process.env.RAILWAY_ENVIRONMENT;

        const storageDir = process.env.STORAGE_PATH ||
            (isReadOnlyEnv
                ? path.join(os.tmpdir(), "safedocs-storage")
                : path.join(process.cwd(), "storage"));

        console.log(`📂 Storage Selection: isReadOnlyEnv=${isReadOnlyEnv}, storageDir=${storageDir}, cwd=${process.cwd()}`);

        const uploadsDir = path.join(storageDir, "uploads");
        await mkdir(uploadsDir, { recursive: true });

        const originalPath = path.join(uploadsDir, `${sha256}_${filename}`);
        await writeFile(originalPath, buffer);

        // 2. Call Python Engine
        console.log(`🚀 Sending to Python Engine at: ${ENGINE_URL}/scan ...`);
        let result: any;
        try {
            const form = new NodeFormData();
            form.append("file", buffer, { filename: filename, contentType: file.type || "application/octet-stream" });

            const response = await axios.post(`${ENGINE_URL}/scan`, form, {
                headers: { ...form.getHeaders() },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 30000,
            });
            result = response.data;
            console.log("✅ Python response received! Verdict:", result.verdict);
        } catch (engineErr: any) {
            console.error("❌ Python Engine Call Failed:", {
                url: ENGINE_URL,
                message: engineErr.message,
                data: engineErr.response?.data
            });
            throw new Error(`Engine Communication Error: ${engineErr.message}. Verify ENGINE_URL is correct.`);
        }

        // 3. Handle Clean File if present
        let cleanPath = null;
        if (result.clean_file_b64) {
            const cleanDir = path.join(storageDir, "clean");
            await mkdir(cleanDir, { recursive: true });

            const cleanBuffer = Buffer.from(result.clean_file_b64, 'hex');
            const cleanFilename = `${result.clean_sha256}_clean_${filename}`;
            cleanPath = path.join(cleanDir, cleanFilename);
            await writeFile(cleanPath, cleanBuffer);
            delete result.clean_file_b64;
        }

        // 4. Save to Prisma
        const scan = await prisma.scan.create({
            data: {
                userId: user.id,
                filename: result.filename,
                cleanFilename: result.clean_filename || (cleanPath ? path.basename(cleanPath) : null),
                verdict: result.verdict.toUpperCase(),
                riskScore: result.risk_score,
                originalPath: originalPath,
                cleanPath: cleanPath,
                sizeBytes: result.size || buffer.length,
                sha256: result.sha256 || sha256,
                contentType: result.content_type || file.type,
                report: result as any,
            },
        });

        const modelScores = result.model_scores || result.signals || {};

        return NextResponse.json({
            scan_id: scan.id,
            report_id: scan.id,
            filename: scan.filename,
            verdict: scan.verdict,
            risk_score: scan.riskScore,
            model_scores: modelScores,
            findings: result.findings || [],
            meta: result.meta || {
                file: scan.filename,
                mime_type: scan.contentType,
                size_bytes: scan.sizeBytes,
                sha256: scan.sha256,
            },
            sanitized: result.sanitized || false,
            clean_risk_score: result.clean_risk_score || scan.riskScore,
            clean_verdict: result.clean_verdict || scan.verdict,
            report: result,
            download_api: scan.cleanPath ? `/api/download/${scan.id}` : null,
            download_clean_url: scan.cleanPath ? `/api/download/${scan.id}` : null,
            report_api: `/api/report/${scan.id}`,
            sha256: scan.sha256,
            size: scan.sizeBytes,
            content_type: scan.contentType,
        });

    } catch (e: any) {
        console.error("❌ Scan route error:", {
            message: e.message,
            stack: e.stack?.split('\n')[0],
            engine: ENGINE_URL
        });
        return NextResponse.json({
            detail: e.message || "Scan failed",
            engine_url: ENGINE_URL,
            error_type: e.constructor.name
        }, { status: 500 });
    }
}
