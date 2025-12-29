import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

/**
 * POST /api/auth/signup
 * Creates new user with email/password using Prisma/PostgreSQL
 */
export async function POST(req: NextRequest) {
    console.log('🔐 /api/auth/signup - Creating new user...');

    try {
        const { email, password, name } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ detail: "Missing fields" }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        console.log('🔐 Checking if user exists:', normalizedEmail);

        // Check if user already exists
        const existing = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (existing) {
            console.log('❌ Email already exists');
            return NextResponse.json({ detail: "Email already exists" }, { status: 400 });
        }

        // Hash password
        const hash = await bcrypt.hash(password, 10);

        // Create user in PostgreSQL
        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                password: hash,
                name: name?.trim() || null,
                lastLoginAt: new Date(),
            },
        });

        console.log('✅ User created:', user.id);

        // Create JWT token
        const token = jwt.sign(
            { sub: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        return NextResponse.json({
            access_token: token,
            token_type: "bearer"
        });

    } catch (e: any) {
        console.error("❌ Signup error:", e);
        return NextResponse.json({ detail: e.message }, { status: 500 });
    }
}
