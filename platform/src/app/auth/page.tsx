"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { api } from "@/lib/api";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
    const { data: session, status } = useSession();

    const [mode, setMode] = useState(initialMode);
    const isSignup = mode === "signup";

    const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [serverMsg, setServerMsg] = useState<string | null>(null);
    const [infoMsg, setInfoMsg] = useState<string | null>(null);

    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [buttonHovered, setButtonHovered] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [loginFailed, setLoginFailed] = useState(false);
    const [idleTime, setIdleTime] = useState(0);

    const idleTimerRef = useRef<NodeJS.Timeout>(undefined);

    const change = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
        resetIdleTimer();
    };

    const resetIdleTimer = () => {
        setIdleTime(0);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => setIdleTime(1), 5000);
    };

    function validate() {
        const e: Record<string, string> = {};
        if (isSignup && !form.name.trim()) e.name = "Full name is required.";
        if (!emailRe.test(form.email)) e.email = "Enter a valid email.";
        if (form.password.length < 6) e.password = "Min 6 characters.";
        if (isSignup && form.password !== form.confirm) e.confirm = "Passwords do not match.";
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function submit(ev: React.FormEvent) {
        ev.preventDefault();
        setServerMsg(null);
        setInfoMsg(null);
        setLoginSuccess(false);
        setLoginFailed(false);

        if (!validate()) {
            setLoginFailed(true);
            setTimeout(() => setLoginFailed(false), 2000);
            return;
        }

        try {
            setBusy(true);
            const email = form.email.trim().toLowerCase();

            if (isSignup) {
                await api.signup({ email, password: form.password, name: form.name.trim() });
                setInfoMsg("Account created! Please sign in.");
                setLoginSuccess(true);
                setTimeout(() => setLoginSuccess(false), 2000);
                setMode("login");
                setForm({ name: "", email: form.email, password: "", confirm: "" });
            } else {
                const out = await api.login({ email, password: form.password });
                const token = out?.access_token;
                if (!token) throw new Error("No token returned from server");
                localStorage.setItem("safedocs_token", token);
                setLoginSuccess(true);
                setTimeout(() => {
                    window.dispatchEvent(new Event("auth-changed"));
                    router.push("/scan");
                }, 1500);
            }
        } catch (err: any) {
            setServerMsg(err.message || "Authentication failed");
            setLoginFailed(true);
            setTimeout(() => setLoginFailed(false), 2000);
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => {
        // Don't check auth while NextAuth is still loading
        if (status === "loading") return;

        // Check for localStorage token (email/password) OR NextAuth session (Google)
        const hasLocalToken = !!localStorage.getItem("safedocs_token");
        const hasGoogleSession = !!session;

        if (hasLocalToken || hasGoogleSession) {
            // User is already authenticated, redirect to scan
            router.push("/scan");
            return;
        }

        resetIdleTimer();
        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [router, session, status]);

    const isFormValid = isSignup
        ? (form.name && form.email && form.password && form.confirm && Object.keys(errors).length === 0)
        : (form.email && form.password);

    return (
        <div className="min-h-screen grid lg:grid-cols-[60%_40%] relative" style={{
            background: 'linear-gradient(to right, #000000 0%, #0a0f1a 50%, #0d1424 75%, #111827 100%)'
        }}>
            <VideoBackground />

            <div className="flex flex-col justify-center px-6 py-12 lg:px-12 relative border-l border-slate-700/30">
                <div className="w-full max-w-sm mx-auto">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {isSignup ? "Create your account" : "Welcome back!"}
                        </h1>
                        <p className="text-slate-400 text-sm">Please enter your details</p>
                    </div>

                    {serverMsg && <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-800 text-sm text-red-400">{serverMsg}</div>}
                    {infoMsg && <div className="mb-6 p-4 rounded-lg bg-green-900/30 border border-green-800 text-sm text-green-400">{infoMsg}</div>}

                    <form onSubmit={submit} className="space-y-5">
                        {isSignup && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
                                <input name="name" value={form.name} onChange={change} onFocus={() => { setFocusedField('name'); resetIdleTimer(); }} onBlur={() => setFocusedField(null)} className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="John Doe" />
                                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                            <input name="email" type="email" value={form.email} onChange={change} onFocus={() => { setFocusedField('email'); resetIdleTimer(); }} onBlur={() => setFocusedField(null)} className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="you@example.com" />
                            {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                            <div className="relative">
                                <input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={change} onFocus={() => { setFocusedField('password'); resetIdleTimer(); }} onBlur={() => setFocusedField(null)} className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10" placeholder="••••••••" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
                        </div>

                        {isSignup && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm password</label>
                                <input name="confirm" type={showPassword ? "text" : "password"} value={form.confirm} onChange={change} onFocus={() => { setFocusedField('confirm'); resetIdleTimer(); }} onBlur={() => setFocusedField(null)} className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="••••••••" />
                                {errors.confirm && <p className="mt-1 text-sm text-red-400">{errors.confirm}</p>}
                            </div>
                        )}

                        {!isSignup && (
                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500" />
                                    <span>Remember me</span>
                                </label>
                                <Link href="/forgot-password" className="text-slate-400 hover:text-white transition-colors">
                                    Forgot password?
                                </Link>
                            </div>
                        )}

                        <button type="submit" disabled={busy} onMouseEnter={() => setButtonHovered(true)} onMouseLeave={() => setButtonHovered(false)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {busy ? "Please wait..." : (isSignup ? "Create account" : "Log in")}
                            {!busy && <ArrowRight className="w-4 h-4" />}
                        </button>

                        {!isSignup && (
                            <button
                                type="button"
                                onClick={() => signIn('google', { callbackUrl: '/auth/callback' })}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full border border-slate-700 transition-colors"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Log in with Google
                            </button>
                        )}
                    </form>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-slate-400">{isSignup ? "Already have an account?" : "Don't have an account?"}</span> <button onClick={() => { setMode(isSignup ? "login" : "signup"); setServerMsg(null); setInfoMsg(null); setErrors({}); }} className="text-white hover:text-blue-400 font-medium transition-colors">{isSignup ? "Sign in" : "Sign Up"}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}




function VideoBackground() {
    return (
        <div className="hidden lg:block relative overflow-hidden">
            {/* No background - parent gradient shows through */}

            {/* Animated Gradient Orbs - More Dynamic */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/25 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Animated Wave Pattern */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{
                    backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 50px,
                  rgba(59, 130, 246, 0.05) 50px,
                  rgba(59, 130, 246, 0.05) 100px
                )`,
                    animation: 'wave 20s linear infinite'
                }}></div>
            </div>

            {/* Floating Particles - More Dynamic */}
            <div className="absolute inset-0">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            width: i % 4 === 0 ? '4px' : i % 3 === 0 ? '3px' : '2px',
                            height: i % 4 === 0 ? '4px' : i % 3 === 0 ? '3px' : '2px',
                            background: i % 2 === 0 ? 'rgba(59, 130, 246, 0.4)' : 'rgba(96, 165, 250, 0.3)',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `floatComplex ${6 + Math.random() * 10}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 5}s`,
                            boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
                        }}
                    ></div>
                ))}
            </div>

            {/* Rotating Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute w-64 h-64 border border-blue-500/20 rounded-full animate-spin-slow"></div>
                <div className="absolute w-80 h-80 border border-cyan-500/15 rounded-full animate-spin-reverse"></div>
                <div className="absolute w-96 h-96 border border-blue-400/10 rounded-full animate-spin-slower"></div>
            </div>

            {/* Scanning Lines - Multiple Directions */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent animate-scanDown"></div>
                <div className="absolute h-full w-px bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent animate-scanRight"></div>
            </div>

            {/* Center Logo */}
            <div className="relative z-10 h-full flex items-center justify-center">
                <div className="text-center">
                    {/* Professional Logo Badge */}
                    <div className="relative inline-block mb-8">
                        {/* Outer Glow */}
                        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse"></div>

                        {/* Hexagonal Badge Container */}
                        <div className="relative">
                            {/* Rotating Ring */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-40 h-40 border-2 border-blue-500/30 rounded-full animate-spin" style={{ animationDuration: '20s' }}></div>
                            </div>

                            {/* Main Badge */}
                            <div className="relative w-36 h-36 flex items-center justify-center">
                                {/* Hexagon Background */}
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                                    <defs>
                                        <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" style={{ stopColor: 'rgb(59, 130, 246)', stopOpacity: 0.2 }} />
                                            <stop offset="100%" style={{ stopColor: 'rgb(37, 99, 235)', stopOpacity: 0.1 }} />
                                        </linearGradient>
                                    </defs>
                                    <polygon
                                        points="50,5 90,30 90,70 50,95 10,70 10,30"
                                        fill="url(#badgeGradient)"
                                        stroke="rgb(59, 130, 246)"
                                        strokeWidth="2"
                                        opacity="0.5"
                                    />
                                </svg>

                                {/* Inner Circle */}
                                <div className="absolute inset-8 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-400/30 backdrop-blur-sm flex items-center justify-center">
                                    {/* Letter S Logo */}
                                    <div className="text-5xl font-bold bg-gradient-to-br from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                                        S
                                    </div>
                                </div>

                                {/* Small Shield Icon Overlay */}
                                <svg className="absolute bottom-2 right-2 w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Logo Text with Better Typography */}
                    <div className="mb-6">
                        <h1 className="text-7xl font-extrabold tracking-tight mb-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                            <span className="bg-gradient-to-r from-white via-slate-200 to-white bg-clip-text text-transparent">Safe</span>
                            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">Docs</span>
                        </h1>

                        {/* Animated Separator */}
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <div className="h-px w-16 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <div className="h-px w-16 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
                        </div>

                        {/* Tagline */}
                        <p className="text-slate-400 text-sm uppercase tracking-[0.3em] font-light">Secure • Intelligent • Trusted</p>
                    </div>
                </div>
            </div>

            {/* Corner Accents */}
            <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-blue-500/30"></div>
            <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-blue-500/30"></div>
            <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-blue-500/30"></div>
            <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-blue-500/30"></div>

            {/* CSS Animations */}
            <style jsx>{`
              @keyframes floatComplex {
                0%, 100% {
                  transform: translate(0, 0) scale(1);
                  opacity: 0.3;
                }
                25% {
                  transform: translate(30px, -40px) scale(1.2);
                  opacity: 0.8;
                }
                50% {
                  transform: translate(-20px, -60px) scale(0.9);
                  opacity: 0.6;
                }
                75% {
                  transform: translate(40px, -30px) scale(1.1);
                  opacity: 0.7;
                }
              }
              
              @keyframes wave {
                0% { transform: translateX(0) translateY(0); }
                100% { transform: translateX(100px) translateY(50px); }
              }
              
              @keyframes scanDown {
                0% { top: -10%; }
                100% { top: 110%; }
              }
              
              @keyframes scanRight {
                0% { left: -10%; }
                100% { left: 110%; }
              }
              
              @keyframes spin-slow {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              
              @keyframes spin-reverse {
                from { transform: rotate(360deg); }
                to { transform: rotate(0deg); }
              }
              
              @keyframes spin-slower {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              
              .animate-scanDown {
                animation: scanDown 5s linear infinite;
              }
              
              .animate-scanRight {
                animation: scanRight 7s linear infinite;
              }
              
              .animate-spin-slow {
                animation: spin-slow 20s linear infinite;
              }
              
              .animate-spin-reverse {
                animation: spin-reverse 25s linear infinite;
              }
              
              .animate-spin-slower {
                animation: spin-slower 30s linear infinite;
              }
            `}</style>
        </div>
    );
}




export default function AuthPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-slate-600">Loading...</div></div>}>
            <AuthContent />
        </Suspense>
    );
}
