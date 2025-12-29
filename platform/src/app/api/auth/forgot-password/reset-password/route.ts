import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Use global OTP cache
declare global {
    var otpCache: Map<string, { otp: string; expires: number }>;
}

if (!global.otpCache) {
    global.otpCache = new Map();
}

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // Check if OTP was verified (should exist in cache)
        const stored = global.otpCache.get(email);
        if (!stored) {
            return NextResponse.json({ error: 'Please verify OTP first' }, { status: 400 });
        }

        // Validate password
        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user password
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        // Clear OTP from cache
        global.otpCache.delete(email);

        console.log(`✅ Password reset successful for ${email}`);

        return NextResponse.json({
            message: 'Password reset successfully',
            success: true
        });

    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
