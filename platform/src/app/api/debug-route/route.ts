import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();

        return NextResponse.json({
            authenticated: !!currentUser,
            user: currentUser,
            headers: {
                authorization: request.headers.get('authorization'),
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            authenticated: false
        });
    }
}
