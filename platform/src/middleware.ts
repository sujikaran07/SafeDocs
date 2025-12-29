import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
    const protectedPaths = ["/dashboard", "/scan", "/settings"];
    const path = request.nextUrl.pathname;

    // Check if current path is protected
    const isProtected = protectedPaths.some(p => path.startsWith(p));

    if (!isProtected) {
        return NextResponse.next();
    }

    // Check for NextAuth token (Google OAuth)
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    });

    if (token) {
        // User has valid NextAuth session (Google login)
        return NextResponse.next();
    }

    // For email/password users, we can't check localStorage here (server-side)
    // So we'll allow the request and let the client-side handle the redirect
    // The page components already check for localStorage token
    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/scan/:path*", "/settings/:path*"],
};
