"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Step 1: Send OTP to email
    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/forgot-password/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (res.ok) {
                setMessage('OTP sent! Check your email');
                setStep('otp');
            } else {
                setError(data.error || 'Failed to send OTP');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        const otpCode = otp.join('');

        try {
            const res = await fetch('/api/auth/forgot-password/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpCode })
            });

            const data = await res.json();

            if (res.ok) {
                setMessage('OTP verified! Enter your new password');
                setStep('password');
            } else {
                setError(data.error || 'Invalid OTP');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/forgot-password/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok) {
                setMessage('Password reset successful! Redirecting to login...');
                setTimeout(() => router.push('/auth'), 2000);
            } else {
                setError(data.error || 'Failed to reset password');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP input
    const handleOTPChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only numbers

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // Only last digit
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    // Handle backspace
    const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-[60%_40%] relative" style={{
            background: 'linear-gradient(to right, #000000 0%, #0a0f1a 50%, #0d1424 75%, #111827 100%)'
        }}>
            {/* Left Side - Logo/Branding (same as login) */}
            <div className="hidden lg:flex items-center justify-center relative overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/25 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                {/* Logo */}
                <div className="relative z-10 text-center">
                    <h1 className="text-7xl font-extrabold tracking-tight mb-4">
                        <span className="bg-gradient-to-r from-white via-slate-200 to-white bg-clip-text text-transparent">Safe</span>
                        <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">Docs</span>
                    </h1>
                    <p className="text-slate-400 text-sm uppercase tracking-[0.3em] font-light">Password Recovery</p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex flex-col justify-center px-6 py-12 lg:px-12 relative border-l border-slate-700/30">
                <div className="w-full max-w-sm mx-auto">
                    {/* Back to Login */}
                    <Link href="/auth" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">Back to login</span>
                    </Link>

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {step === 'email' && 'Forgot Password?'}
                            {step === 'otp' && 'Verify OTP'}
                            {step === 'password' && 'Reset Password'}
                        </h1>
                        <p className="text-slate-400 text-sm">
                            {step === 'email' && "Enter your email to receive a verification code"}
                            {step === 'otp' && "Enter the 6-digit code sent to your email"}
                            {step === 'password' && "Create a new password for your account"}
                        </p>
                    </div>

                    {/* Messages */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}
                    {message && (
                        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <p className="text-green-400 text-sm">{message}</p>
                        </div>
                    )}

                    {/* Step 1: Email Input */}
                    {step === 'email' && (
                        <form onSubmit={handleSendOTP} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Sending...' : 'Send Verification Code'}
                            </button>
                        </form>
                    )}

                    {/* Step 2: OTP Input */}
                    {step === 'otp' && (
                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-4">
                                    Enter 6-Digit Code
                                </label>
                                <div className="flex gap-2 justify-center">
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`otp-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOTPChange(index, e.target.value)}
                                            onKeyDown={(e) => handleOTPKeyDown(index, e)}
                                            className="w-12 h-14 text-center text-2xl font-bold bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep('email')}
                                className="w-full text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                Didn't receive code? Resend
                            </button>
                        </form>
                    )}

                    {/* Step 3: New Password Input */}
                    {step === 'password' && (
                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    placeholder="Enter new password"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    placeholder="Confirm new password"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
