"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        async function handleOAuthCallback() {
            if (status === "loading") return;

            if (session?.user?.email) {
                try {
                    console.log('🔐 Google OAuth callback - Getting token...');

                    // Get JWT token from our Prisma-based endpoint (GET, not POST)
                    const response = await fetch('/api/auth/token');

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('❌ Failed to get token:', errorText);
                        router.push('/auth');
                        return;
                    }

                    const data = await response.json();
                    console.log('🔐 Token response:', { hasToken: !!data.access_token });

                    if (data.access_token) {
                        // Store token in localStorage
                        localStorage.setItem("safedocs_token", data.access_token);

                        // Notify app of auth change
                        window.dispatchEvent(new Event("auth-changed"));
                        window.dispatchEvent(new Event("safedocs:auth-changed"));

                        console.log('✅ Google OAuth successful, redirecting to /scan');
                        router.push('/scan');
                    } else {
                        console.error('❌ No token in response');
                        router.push('/auth');
                    }
                } catch (error) {
                    console.error('❌ OAuth callback error:', error);
                    router.push('/auth');
                }
            } else {
                console.log('❌ No session, redirecting to /auth');
                router.push('/auth');
            }
        }

        handleOAuthCallback();
    }, [session, status, router]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-sm text-white">Completing sign in...</p>
            </div>
        </div>
    );
}
