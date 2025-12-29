import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

/**
 * GET /api/auth/token
 * Returns JWT token for Google OAuth users stored in Prisma/PostgreSQL
 * This endpoint is called by authHeaders() to get the token for API requests.
 */
export async function GET(req: NextRequest) {
    console.log('🔐 /api/auth/token - Getting token for Google OAuth user...');

    try {
        // Check if user has a NextAuth session (Google login)
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET
        });

        console.log('🔐 NextAuth session check:', {
            hasToken: !!token,
            email: token?.email,
        });

        if (!token || !token.email) {
            console.log('❌ No NextAuth session found');
            return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 });
        }

        const email = token.email.toLowerCase().trim();
        console.log('🔐 Looking up user in Prisma:', email);

        // Find or create user in PostgreSQL - case-insensitive
        let user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive'
                }
            }
        });

        if (!user) {
            console.log('🔐 Creating new Google OAuth user...');

            // Create new user for Google OAuth
            user = await prisma.user.create({
                data: {
                    email,
                    name: token.name || email.split('@')[0],
                    password: null, // No password for OAuth users
                    emailVerified: new Date(),
                    image: token.picture as string || null,
                    lastLoginAt: new Date(),
                }
            });

            console.log('✅ Created new user:', user.id);
        } else {
            // Update last login
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() }
            });

            console.log('✅ Found existing user:', user.id);
        }

        // Create JWT token (same format as email/password login)
        const jwtToken = jwt.sign(
            { sub: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ JWT token created for Google user');

        return NextResponse.json({
            access_token: jwtToken,
            token_type: 'bearer',
        });

    } catch (error: any) {
        console.error('❌ Token endpoint error:', {
            message: error.message,
            error
        });
        return NextResponse.json({
            error: 'Failed to get token',
            message: error.message,
        }, { status: 500 });
    }
}
