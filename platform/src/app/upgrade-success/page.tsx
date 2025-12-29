'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UpgradeSuccessPage() {
    const [countdown, setCountdown] = useState(5);
    const [plan, setPlan] = useState('PRO');
    const router = useRouter();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const upgradePlan = urlParams.get('plan') || 'PRO';
        setPlan(upgradePlan);

        // Proactively sync the plan status in case webhooks are slow
        const syncSubscription = async () => {
            try {
                const token = localStorage.getItem('safedocs_token');
                if (!token) return;

                console.log('📡 Syncing subscription status...');
                await fetch('/api/stripe/sync', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (err) {
                console.error('Failed to sync subscription:', err);
            }
        };

        syncSubscription();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (countdown <= 0) {
            router.push('/dashboard');
        }
    }, [countdown, router]);

    const planPrice = plan === 'ENTERPRISE' ? '$199' : '$29';

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-black flex items-center justify-center p-4">
            <div className="max-w-lg w-full">
                {/* Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center">

                    {/* Checkmark with animation */}
                    <div className="mb-6">
                        <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/20 border-4 border-green-500 dark:border-green-600 flex items-center justify-center animate-scale-in">
                            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        Payment Successful!
                    </h1>

                    {/* Plan Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {plan} Plan - {planPrice}/month
                        </span>
                    </div>

                    {/* Description */}
                    <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                        Your subscription is now active. You have full access to all premium features.
                    </p>

                    {/* Features list */}
                    <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                        <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Receipt sent to your email</span>
                        </div>
                    </div>

                    {/* Countdown */}
                    <div className="mb-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                Redirecting to dashboard in {countdown}s
                            </span>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="space-y-3">
                        <Link
                            href="/dashboard"
                            className="block w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                        >
                            Go to Dashboard
                        </Link>
                        <Link
                            href="/settings"
                            className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 px-6 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            Manage Subscription
                        </Link>
                    </div>
                </div>
            </div>

            {/* Animation styles */}
            <style jsx>{`
                @keyframes scale-in {
                    from {
                        transform: scale(0);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                .animate-scale-in {
                    animation: scale-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
