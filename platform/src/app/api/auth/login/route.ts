import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

/**
 * POST /api/auth/login
 * Authenticates user with email/password using Prisma/PostgreSQL
 */
export async function POST(req: NextRequest) {
    console.log('🔐 /api/auth/login - Email/password login...');

    try {
        // Handle form-urlencoded (OAuth2PasswordRequestForm format)
        const formData = await req.formData();
        const email = (formData.get("username") as string)?.toLowerCase().trim();
        const password = formData.get("password") as string;

        if (!email || !password) {
            return NextResponse.json({ detail: "Missing credentials" }, { status: 400 });
        }

        console.log('🔐 Looking up user:', email);

        // Find user in PostgreSQL
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.log('❌ User not found');
            return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });
        }

        if (!user.password) {
            console.log('❌ User has no password (OAuth user)');
            return NextResponse.json({ detail: "Please use Google Sign In" }, { status: 401 });
        }

        // Verify password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            console.log('❌ Invalid password');
            return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });
        }

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });

        // Create JWT token
        const token = jwt.sign(
            { sub: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        console.log('✅ Login successful');

        return NextResponse.json({
            access_token: token,
            token_type: "bearer"
        });

    } catch (e: any) {
        console.error("❌ Login error:", e);
        return NextResponse.json({ detail: e.message }, { status: 500 });
    }
}
