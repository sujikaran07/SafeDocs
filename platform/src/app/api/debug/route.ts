import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { headers } from "next/headers";
import os from "os";
import fs from "fs/promises";
import path from "path";

export async function GET() {
    const stats: any = {
        timestamp: new Date().toISOString(),
        env: {
            NODE_ENV: process.env.NODE_ENV,
            RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || "no",
            NEXTAUTH_URL: process.env.NEXTAUTH_URL || "missing",
            PLATFORM: process.platform,
            CWD: process.cwd(),
        },
        diagnostics: []
    };

    // 1. Check Database
    try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        stats.diagnostics.push({
            name: "Database (Neon)",
            status: "OK",
            latency: `${Date.now() - start}ms`
        });
    } catch (e: any) {
        stats.diagnostics.push({
            name: "Database (Neon)",
            status: "FAILED",
            error: e.message
        });
    }

    // 2. Check Engine
    const ENGINE_URL = (process.env.ENGINE_URL || "http://localhost:8000").replace(/^["'](.+)["']$/, '$1');
    try {
        const start = Date.now();
        const res = await axios.get(`${ENGINE_URL}/health`, { timeout: 5000 });
        stats.diagnostics.push({
            name: "AI Engine",
            status: "OK",
            url: ENGINE_URL,
            latency: `${Date.now() - start}ms`,
            response: res.data
        });
    } catch (e: any) {
        stats.diagnostics.push({
            name: "AI Engine",
            status: "FAILED",
            url: ENGINE_URL,
            error: e.message
        });
    }

    // 3. Check Storage
    try {
        const isReadOnlyEnv =
            process.env.NODE_ENV === "production" ||
            process.cwd().includes('/var/task') ||
            process.cwd().includes('/app') ||
            !!process.env.RAILWAY_ENVIRONMENT;

        const storageDir = process.env.STORAGE_PATH ||
            (isReadOnlyEnv ? path.join(os.tmpdir(), "safedocs-storage-debug") : path.join(process.cwd(), "storage-debug"));

        await fs.mkdir(storageDir, { recursive: true });
        const testFile = path.join(storageDir, "test.txt");
        await fs.writeFile(testFile, "test content");
        await fs.unlink(testFile);

        stats.diagnostics.push({
            name: "File Storage",
            status: "OK",
            dir: storageDir,
            type: isReadOnlyEnv ? "Ephemeral (/tmp)" : "Local Disk"
        });
    } catch (e: any) {
        stats.diagnostics.push({
            name: "File Storage",
            status: "FAILED",
            error: e.message
        });
    }

    // 4. Check Environment Variables (Masked)
    const mask = (s: string | undefined) => {
        if (!s) return "MISSING";
        const clean = s.replace(/^["'](.+)["']$/, '$1');
        if (clean.length < 10) return "****";
        return clean.substring(0, 4) + "..." + clean.substring(clean.length - 4);
    };

    stats.secrets = {
        NEXTAUTH_SECRET: mask(process.env.NEXTAUTH_SECRET),
        JWT_SECRET: mask(process.env.JWT_SECRET),
        GOOGLE_CLIENT_ID: mask(process.env.GOOGLE_CLIENT_ID),
        STRIPE_SECRET_KEY: mask(process.env.STRIPE_SECRET_KEY),
        DATABASE_URL_HAS_QUOTES: process.env.DATABASE_URL?.startsWith('"') || process.env.DATABASE_URL?.endsWith('"'),
    };

    return NextResponse.json(stats);
}
