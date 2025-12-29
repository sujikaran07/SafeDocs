"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { HiMenu, HiX } from "react-icons/hi";
import { Bell } from "lucide-react";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import UserProfileDropdown from "./UserProfileDropdown";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    // Don't update auth state while session is loading
    if (status === "loading") return;

    const sync = () => {
      // User is authed if they have localStorage token OR NextAuth session
      const hasToken = !!localStorage.getItem("safedocs_token");
      const hasSession = !!session;
      setAuthed(hasToken || hasSession);
    };

    sync();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "safedocs_token") sync();
    };
    window.addEventListener("storage", onStorage);

    const onAuthChanged = () => sync();
    window.addEventListener("auth-changed", onAuthChanged);
    window.addEventListener("safedocs:auth-changed", onAuthChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-changed", onAuthChanged);
      window.removeEventListener("safedocs:auth-changed", onAuthChanged);
    };
  }, [session, status]);

  async function signOut() {
    // Clear localStorage token
    localStorage.removeItem("safedocs_token");

    // Sign out from NextAuth if user has a session
    if (session) {
      await nextAuthSignOut({ redirect: false });
    }

    setAuthed(false);
    window.dispatchEvent(new Event("auth-changed"));
    window.dispatchEvent(new Event("safedocs:auth-changed"));
    router.push("/auth");
  }

  // Public navigation links - visible to everyone
  const publicLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  // Authenticated navigation links - only visible when logged in
  const authLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Scan", href: "/scan" },
  ];

  // Combine links based on authentication status
  const navLinks = authed
    ? [
      { name: "Home", href: "/" },
      { name: "Dashboard", href: "/dashboard" },
      { name: "Scan", href: "/scan" },
      { name: "About", href: "/about" },
      { name: "Contact", href: "/contact" },
    ]
    : publicLinks;

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-[#0a0a0a] border-b border-slate-300 dark:border-slate-800">
      <div className="mx-auto max-w-7xl">
        <nav className="flex items-center justify-between px-6 py-4">
          {/* Brand */}
          <Link href="/" aria-label="SafeDocs Home" className="flex items-center gap-3 group">
            <Image
              src="/safedocs-icon.png"
              alt="SafeDocs"
              width={40}
              height={40}
              className="w-10 h-10 transition-opacity group-hover:opacity-80"
              priority
            />
            <span className="text-xl font-bold">
              <span className="text-slate-900 dark:text-white">Safe</span>
              <span className="text-blue-500">Docs</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative py-2 text-sm font-medium transition-colors"
                >
                  <span className={isActive ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"}>
                    {link.name}
                  </span>
                  <span
                    className={`absolute bottom-0 left-0 h-[2px] bg-indigo-500 transition-all duration-300 ${isActive ? "w-full" : "w-0 group-hover:w-full"
                      }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* Right Side - Notifications & Profile */}
          <div className="hidden lg:flex items-center gap-6">
            {!authed ? (
              <Link
                href="/auth"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Sign in
              </Link>
            ) : (
              <>
                {/* Notification Bell */}
                <Link
                  href="/notifications"
                  className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all group"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {/* Unread badge */}
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#0a0a0a] group-hover:scale-110 transition-transform">
                    3
                  </span>
                </Link>

                <UserProfileDropdown onSignOut={signOut} />
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0a0a0a]">
            <div className="px-6 py-4 space-y-3">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block py-2 text-sm font-medium border-l-2 pl-4 transition-colors ${isActive
                      ? "border-indigo-500 text-slate-900 dark:text-white"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600"
                      }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              <div className="pt-4 border-t border-slate-300 dark:border-slate-800">
                {!authed ? (
                  <Link
                    href="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded text-center transition-colors"
                  >
                    Sign in
                  </Link>
                ) : (
                  <div className="space-y-3">
                    {/* Notifications Link */}
                    <Link
                      href="/notifications"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between py-2 px-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-sm font-semibold text-slate-900 dark:text-white transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Notifications
                      </span>
                      <span className="w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        3
                      </span>
                    </Link>

                    <button
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded border border-slate-700 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
