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

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }


        // ⚠️ TEMPORARY: Quota check disabled until Prisma client is regenerated
        // TODO: Uncomment after running: npx prisma generate
        /*
        const quotaCheck = await canUserScan(user.id);
        if (!quotaCheck.allowed) {
            return NextResponse.json({
                detail: quotaCheck.reason || "Quota exceeded",
                quota_exceeded: true,
                scans_used: quotaCheck.scansUsed,
                scans_limit: quotaCheck.scansLimit,
                plan: quotaCheck.plan,
                upgrade_url: "/upgrade"
            }, { status: 403 });
        }
        console.log(`✅ Quota check passed: ${quotaCheck.scansUsed}/${quotaCheck.scansLimit} scans used`);
        */


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
        // Use /tmp in production (serverless/Vercel/Railway) to avoid EROFS: read-only file system
        // Forced check for '/var/task' or '/app' which are common read-only paths in containers/serverless
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

        // Use sha256 as filename to avoid collisions/traversal
        const originalPath = path.join(uploadsDir, `${sha256}_${filename}`);
        await writeFile(originalPath, buffer);

        // 2. Call Python Engine
        // Use the 'form-data' library explicitly to handle Buffers in Node.js
        console.log("Sending to Python Engine...");
        const result = await (async () => {
            const form = new NodeFormData();
            form.append("file", buffer, { filename: filename, contentType: file.type || "application/octet-stream" });

            const response = await axios.post(`${ENGINE_URL}/scan`, form, {
                headers: {
                    ...form.getHeaders(),
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });
            return response.data;
        })();

        console.log("Python response received!");
        console.log("Keys in response:", Object.keys(result));
        console.log("Full response:", JSON.stringify(result, null, 2));

        // 3. Handle Clean File if present
        let cleanPath = null;
        if (result.clean_file_b64) {
            const cleanDir = path.join(storageDir, "clean");
            await mkdir(cleanDir, { recursive: true });

            const cleanBuffer = Buffer.from(result.clean_file_b64, 'hex'); // Assuming I sent hex
            const cleanFilename = `${result.clean_sha256}_clean_${filename}`;
            cleanPath = path.join(cleanDir, cleanFilename);
            await writeFile(cleanPath, cleanBuffer);

            // Remove the b64 from the report before saving to DB to save space
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
                report: result as any, // Save full report as JSON object for PostgreSQL JSONB
            },
        });


        // 5. INCREMENT SCAN USAGE (for quota tracking)
        // TODO: Uncomment after Prisma generate
        // await incrementScanUsage(user.id);
        // console.log(`✅ Scan usage incremented for user ${user.id}`);


        // 6. Extract model scores from engine response
        // The Python engine might return it as 'signals' 
        const modelScores = result.model_scores || result.signals || {};

        // 6. Response - send complete data to frontend
        return NextResponse.json({
            scan_id: scan.id,
            report_id: scan.id,
            filename: scan.filename,
            verdict: scan.verdict,
            risk_score: scan.riskScore,

            // Model detection scores
            model_scores: modelScores,

            // Findings and metadata
            findings: result.findings || [],
            meta: result.meta || {
                file: scan.filename,
                mime_type: scan.contentType,
                size_bytes: scan.sizeBytes,
                sha256: scan.sha256,
            },

            // Sanitization info
            sanitized: result.sanitized || false,
            clean_risk_score: result.clean_risk_score || scan.riskScore,
            clean_verdict: result.clean_verdict || scan.verdict,

            // Full report for detailed view
            report: result,

            // Download links
            download_api: scan.cleanPath ? `/api/download/${scan.id}` : null,
            download_clean_url: scan.cleanPath ? `/api/download/${scan.id}` : null,
            report_api: `/api/report/${scan.id}`,

            // Additional info
            sha256: scan.sha256,
            size: scan.sizeBytes,
            content_type: scan.contentType,
        });

    } catch (e: any) {
        console.error("Scan error:", e);
        return NextResponse.json({ detail: e.message || "Scan failed" }, { status: 500 });
    }
}
