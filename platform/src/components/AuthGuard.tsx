"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

/**
 * Next.js Auth Guard.
 * Monitors both localStorage tokens (email/password) and NextAuth session (Google OAuth)
 * Redirects unauthenticated users to the auth page.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);
    const { data: session, status } = useSession();

    useEffect(() => {
        // Wait for NextAuth to load
        if (status === "loading") return;

        // Check for token in localStorage (email/password login)
        const token = localStorage.getItem("safedocs_token");

        // User is authenticated if:
        // 1. They have a localStorage token (email/password), OR
        // 2. They have a NextAuth session (Google OAuth)
        const isAuthenticated = !!token || !!session;

        if (!isAuthenticated) {
            // Not authenticated with either method
            setAuthorized(false);
            router.replace(`/auth?redirect=${pathname}`);
        } else {
            setAuthorized(true);
        }
    }, [router, pathname, session, status]);

    // Show loading spinner while checking auth
    if (!authorized || status === "loading") {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
