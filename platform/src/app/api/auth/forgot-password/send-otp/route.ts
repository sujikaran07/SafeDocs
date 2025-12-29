import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Use global OTP cache shared across routes
declare global {
    var otpCache: Map<string, { otp: string; expires: number }>;
}

if (!global.otpCache) {
    global.otpCache = new Map();
}

// Generate 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
        }

        // Generate OTP
        const otp = generateOTP();
        const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store OTP in global cache
        global.otpCache.set(email, { otp, expires });

        // Log OTP to terminal for testing
        console.log('\n' + '='.repeat(50));
        console.log('🔐 PASSWORD RESET OTP');
        console.log('='.repeat(50));
        console.log(`📧 Email: ${email}`);
        console.log(`🔢 OTP Code: ${otp}`);
        console.log(`⏰ Expires: ${new Date(expires).toLocaleTimeString()}`);
        console.log('='.repeat(50) + '\n');

        // TODO: In production, send email here
        // await sendEmail(email, 'Password Reset OTP', `Your OTP code is: ${otp}`);

        return NextResponse.json({
            message: 'OTP sent successfully (check terminal for testing)',
            success: true
        });

    } catch (error) {
        console.error('Send OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
