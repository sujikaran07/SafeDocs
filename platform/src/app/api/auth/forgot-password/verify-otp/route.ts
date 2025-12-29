import { NextRequest, NextResponse } from 'next/server';

// Import the same OTP store (you'll need to share this between routes)
// For simplicity, using a simple Map - in production use Redis
const otpStore = new Map<string, { otp: string; expires: number }>();

// Note: This shares the same store as send-otp
// In production, use a shared cache like Redis
declare global {
    var otpCache: Map<string, { otp: string; expires: number }>;
}

if (!global.otpCache) {
    global.otpCache = new Map();
}

export async function POST(req: NextRequest) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        // Get stored OTP
        const stored = global.otpCache.get(email);

        if (!stored) {
            return NextResponse.json({ error: 'No OTP found. Please request a new one.' }, { status: 400 });
        }

        // Check if expired
        if (Date.now() > stored.expires) {
            global.otpCache.delete(email);
            return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
        }

        // Verify OTP
        if (stored.otp !== otp) {
            return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
        }

        console.log(`✅ OTP verified for ${email}`);

        // Keep OTP for password reset step (delete after password reset)
        return NextResponse.json({
            message: 'OTP verified successfully',
            success: true
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
