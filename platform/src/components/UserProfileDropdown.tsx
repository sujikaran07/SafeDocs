"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { HiCog, HiLogout, HiChevronDown, HiSparkles } from "react-icons/hi";
import { useSession } from "next-auth/react";

interface User {
    id: string;
    email: string;
    name: string;
}

interface UserProfileDropdownProps {
    onSignOut: () => void;
}

export default function UserProfileDropdown({ onSignOut }: UserProfileDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { data: session, status } = useSession();

    useEffect(() => {
        // Fetch user data
        const fetchUser = async () => {
            try {
                // If user is logged in with Google (NextAuth session)
                if (session?.user) {
                    setUser({
                        id: (session.user as any).id || 'google-user',
                        email: session.user.email || '',
                        name: session.user.name || session.user.email?.split('@')[0] || 'User',
                    });
                    setLoading(false);
                    return;
                }

                // Otherwise try localStorage token (email/password login)
                const token = localStorage.getItem("safedocs_token");
                if (!token) {
                    setLoading(false);
                    return;
                }

                const response = await fetch("/api/auth/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                }
            } catch (error) {
                console.error("Failed to fetch user:", error);
            } finally {
                setLoading(false);
            }
        };

        if (status !== "loading") {
            fetchUser();
        }
    }, [session, status]);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse">
                <div className="w-8 h-8 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                <div className="w-20 h-4 bg-slate-300 dark:bg-slate-700 rounded"></div>
            </div>
        );
    }

    if (!user) return null;

    // Get user initials
    const getInitials = (name: string, email: string) => {
        if (name && name.trim()) {
            const parts = name.trim().split(" ");
            if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return name.substring(0, 2).toUpperCase();
        }
        return email.substring(0, 2).toUpperCase();
    };

    const initials = getInitials(user.name, user.email);
    const displayName = user.name || user.email.split("@")[0];

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Profile Button - Avatar + Welcome Back + Name */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
                {/* Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg">
                    {initials}
                </div>

                {/* Welcome Back + Name - Hidden on mobile */}
                <div className="hidden md:flex flex-col items-start">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">Welcome Back</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white leading-tight mt-0.5 whitespace-nowrap">
                        {displayName}
                    </span>
                </div>

                {/* Chevron */}
                <HiChevronDown
                    className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info - Shows username only */}
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {user.name || "User"}
                        </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        {/* Upgrade Plan */}
                        <Link
                            href="/upgrade"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                        >
                            <HiSparkles className="w-4 h-4" />
                            Upgrade Plan
                        </Link>

                        {/* Settings */}
                        <Link
                            href="/settings"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <HiCog className="w-4 h-4" />
                            Settings
                        </Link>

                        {/* Divider */}
                        <div className="my-2 border-t border-slate-200 dark:border-slate-700"></div>

                        {/* Logout */}
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onSignOut();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        >
                            <HiLogout className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
