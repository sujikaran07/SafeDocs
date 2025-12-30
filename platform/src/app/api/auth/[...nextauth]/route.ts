import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Database & Env Diagnostics for Production 500 Troubleshooting
console.log('--- NextAuth Initialization Diagnostics ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('NEXTAUTH_SECRET present:', !!process.env.NEXTAUTH_SECRET);
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL prefix:', process.env.DATABASE_URL.substring(0, 15) + '...');
}

// Test Database Connection immediately
prisma.$connect()
    .then(() => console.log('✅ NextAuth: Database connection successful'))
    .catch(err => console.error('❌ NextAuth: Database connection failed:', err.message));

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as any,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            profile(profile) {
                const email = profile.email?.toLowerCase().trim() || null;
                console.log('🔍 Google Profile received:', { name: profile.name, email });
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: email,
                    image: profile.picture,
                }
            }
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const email = credentials.email.toLowerCase().trim();
                const user = await prisma.user.findUnique({
                    where: { email }
                });

                if (!user || !user.password) {
                    return null;
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);

                if (!isValid) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                };
            }
        })
    ],
    session: {
        strategy: "jwt"
    },
    pages: {
        signIn: '/auth',
        error: '/auth',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
            }
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development' || !!process.env.DEBUG_AUTH,
    logger: {
        error(code, metadata) {
            console.error('❌ NextAuth Error:', code, metadata);
        },
        warn(code) {
            console.warn('⚠️ NextAuth Warning:', code);
        },
        debug(code, metadata) {
            console.log('🔍 NextAuth Debug:', code, metadata);
        },
    },
};

// Log warning if NEXTAUTH_SECRET is missing (major cause of 500 errors in production)
if (!process.env.NEXTAUTH_SECRET) {
    console.error('❌ CRITICAL: NEXTAUTH_SECRET is not defined in environment variables!');
}
if (!process.env.NEXTAUTH_URL) {
    console.warn('⚠️ WARNING: NEXTAUTH_URL is not defined. This may cause issues in production.');
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
