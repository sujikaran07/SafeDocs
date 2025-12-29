import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { email, name } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Call Python backend OAuth login endpoint
        const backendUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api';

        const response = await fetch(`${backendUrl}/auth/oauth-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                name: name || email.split('@')[0],
                provider: 'google'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Backend OAuth login failed:', error);
            return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
        }

        const tokenData = await response.json();

        return NextResponse.json({
            access_token: tokenData.access_token,
            token_type: tokenData.token_type || 'bearer',
        });

    } catch (error) {
        console.error('OAuth token error:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}
