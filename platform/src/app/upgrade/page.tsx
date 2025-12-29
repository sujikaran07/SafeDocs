"use client";

import { useState, useEffect } from "react";
import { Check, Zap, Shield, Crown } from "lucide-react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";

const PLANS = [
    {
        name: "FREE",
        price: 0,
        period: "month",
        icon: Shield,
        color: "from-slate-500 to-slate-600",
        features: [
            "3 document scans per month",
            "Basic threat detection",
            "48-hour file retention",
            "Email support"
        ],
        limits: "Limited features"
    },
    {
        name: "PRO",
        price: 29,
        period: "month",
        icon: Zap,
        color: "from-blue-500 to-blue-600",
        popular: true,
        features: [
            "100 document scans per month",
            "Advanced AI detection (LightGBM + MiniLM)",
            "30-day file retention",
            "Priority email support",
            "API access",
            "Detailed analytics"
        ],
        limits: "Best for individuals"
    },
    {
        name: "ENTERPRISE",
        price: 199,
        period: "month",
        icon: Crown,
        color: "from-purple-500 to-purple-600",
        features: [
            "Unlimited document scans",
            "All AI models + custom rules",
            "Unlimited file retention",
            "24/7 phone & email support",
            "Dedicated account manager",
            "Custom integrations",
            "SLA guarantee",
            "Advanced compliance reports"
        ],
        limits: "Best for teams"
    }
];

export default function UpgradePage() {
    return (
        <AuthGuard>
            <UpgradeContent />
        </AuthGuard>
    );
}

function UpgradeContent() {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('safedocs_token');
            if (!token) return;

            const response = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setProfile(data);
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        }
    };

    const handleManageSubscription = async () => {
        try {
            const token = localStorage.getItem('safedocs_token');
            const response = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Failed to open portal:', error);
            alert('Failed to open subscription manager');
        }
    };

    const handleUpgrade = async (planName: string) => {
        // 1. Already on this plan
        if (profile?.user?.plan === planName) {
            alert(`You're already on the ${planName} plan`);
            return;
        }

        // 2. Handle switching for users with ACTIVE subscriptions
        if (profile?.user?.hasActiveSubscription) {
            // Show loading state for the clicked plan
            setLoading(planName);

            // For existing subscribers, all plan changes (Upgrade/Downgrade/Cancel)
            // are handled via the secure Customer Portal to ensure correct pro-ration.
            handleManageSubscription();
            return;
        }

        // 3. New Upgrade / First Time Subscription
        setLoading(planName);

        try {
            const token = localStorage.getItem('safedocs_token');

            if (!token) {
                alert('Please log in to upgrade your plan');
                router.push('/auth');
                return;
            }

            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ plan: planName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to start checkout');
            }

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL received');
            }

        } catch (error: any) {
            console.error('Upgrade error:', error);
            alert(error.message || "Upgrade failed. Please try again.");
        } finally {
            setLoading(null);
        }
    };

    const getButtonText = (planName: string) => {
        const currentPlan = profile?.user?.plan || 'FREE';

        if (currentPlan === planName) {
            return 'Current Plan';
        }

        const planOrder: Record<string, number> = { 'FREE': 0, 'PRO': 1, 'ENTERPRISE': 2 };
        const currentOrder = planOrder[currentPlan];
        const targetOrder = planOrder[planName];

        if (targetOrder > currentOrder) {
            return `Upgrade to ${planName}`;
        } else {
            return `Switch to ${planName}`;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white dark:from-black dark:via-slate-950 dark:to-black py-16">
            <div className="mx-auto max-w-7xl px-4">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-extrabold mb-4">
                        <span className="text-slate-900 dark:text-white">Choose Your </span>
                        <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Plan</span>
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Unlock the full power of AI-driven document security. Upgrade for unlimited scans and advanced features.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto items-stretch">
                    {PLANS.map((plan, index) => {
                        const Icon = plan.icon;
                        const isPopular = plan.popular;
                        const isCurrent = profile?.user?.plan === plan.name;
                        const isCenter = index === 1;

                        return (
                            <div key={plan.name} className="relative flex flex-col">
                                {/* Popular Badge */}
                                {isPopular && !isCurrent && (
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-400 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                                            ⭐ MOST POPULAR
                                        </span>
                                    </div>
                                )}

                                {/* Current Plan Badge */}
                                {isCurrent && (
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-green-600 to-green-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                                            ✓ YOUR PLAN
                                        </span>
                                    </div>
                                )}

                                <div
                                    className={`flex-1 rounded-3xl border transition-all duration-300 hover:shadow-2xl flex flex-col p-8
                                        ${isCenter
                                            ? "border-blue-500 shadow-xl shadow-blue-500/20 md:scale-105 z-10 bg-white dark:bg-slate-900"
                                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 md:scale-100"
                                        }
                                        ${isCurrent ? "border-green-500 ring-2 ring-green-500/20" : ""}
                                    `}
                                >

                                    {/* Icon */}
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6 shadow-lg`}>
                                        <Icon className="w-8 h-8 text-white" />
                                    </div>

                                    {/* Plan Name */}
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                        {plan.name}
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                                        {plan.limits}
                                    </p>

                                    {/* Price */}
                                    <div className="mb-8">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-extrabold text-slate-900 dark:text-white">
                                                ${plan.price}
                                            </span>
                                            <span className="text-slate-600 dark:text-slate-400">
                                                /{plan.period}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Features */}
                                    <ul className="space-y-4 mb-8 flex-1">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <div className={`mt-1 w-5 h-5 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center flex-shrink-0`}>
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA Button */}
                                    <div className="mt-auto">
                                        <button
                                            onClick={() => handleUpgrade(plan.name)}
                                            disabled={loading === plan.name || isCurrent}
                                            className={`w-full py-4 rounded-xl font-bold text-white transition-all ${isCurrent
                                                ? "bg-slate-400 dark:bg-slate-600 cursor-not-allowed"
                                                : isCenter
                                                    ? `bg-gradient-to-r ${plan.color} hover:shadow-lg`
                                                    : "bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600"
                                                } disabled:opacity-50`}
                                        >
                                            {loading === plan.name ? "Processing..." : getButtonText(plan.name)}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
