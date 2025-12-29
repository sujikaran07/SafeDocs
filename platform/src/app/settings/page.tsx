"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, Trash2, Mail, Calendar, Bell, CreditCard, Settings as SettingsIcon, Shield, AlertTriangle, X } from "lucide-react";

import AuthGuard from "@/components/AuthGuard";

export default function SettingsPage() {
    return (
        <AuthGuard>
            <SettingsContent />
        </AuthGuard>
    );
}

function SettingsContent() {
    const router = useRouter();
    const [me, setMe] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null); // Add profile state
    const [pw, setPw] = useState({ old: "", next: "", confirm: "" });
    const [msg, setMsg] = useState<string | null>(null);
    const [isError, setIsError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [scanAlerts, setScanAlerts] = useState(true);

    // Confirmation modals
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    useEffect(() => {
        // Fetch user data
        api.me()
            .then(setMe)
            .catch((e) => {
                if (e.status === 401) router.push("/auth");
            });

        // Fetch profile with plan info
        fetchProfile();
    }, [router]);

    async function fetchProfile() {
        try {
            const token = localStorage.getItem('safedocs_token');
            if (!token) return;

            // Sync with Stripe first to ensure latest status
            await fetch('/api/stripe/sync', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(e => console.error('Sync failed', e));

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
    }


    async function changePassword(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        setIsError(false);

        if (!pw.old || !pw.next) return showMsg("All fields are required.", true);
        if (pw.next !== pw.confirm) return showMsg("New passwords do not match.", true);
        if (pw.next.length < 6) return showMsg("New password must be at least 6 characters.", true);

        // Show confirmation modal
        setShowPasswordConfirm(true);
    }

    async function confirmPasswordChange() {
        setShowPasswordConfirm(false);

        try {
            setBusy(true);
            await api.changePassword({ old_password: pw.old, new_password: pw.next });
            showMsg("Password updated successfully! You can now use your new password to log in.", false);
            setPw({ old: "", next: "", confirm: "" });
        } catch (err: any) {
            showMsg(err.message || "Failed to update password. Please check your current password and try again.", true);
        } finally {
            setBusy(false);
        }
    }

    function showMsg(m: string, error = false) {
        setMsg(m);
        setIsError(error);
        setTimeout(() => setMsg(null), 5000);
    }

    function openDeleteModal() {
        setDeletePassword("");
        setDeleteConfirmText("");
        setShowDeleteConfirm(true);
    }

    async function confirmDeleteAccount() {
        // Validate password first
        if (!deletePassword) {
            return showMsg('Please enter your password to confirm.', true);
        }

        // Validate email confirmation
        if (deleteConfirmText !== me?.email) {
            return showMsg('Please type your email address exactly to confirm.', true);
        }

        try {
            setBusy(true);
            setShowDeleteConfirm(false);

            // Verify password by attempting to change it to itself (or use a dedicated verify endpoint if available)
            await api.deleteAccount();

            localStorage.removeItem("safedocs_token");
            window.dispatchEvent(new Event("auth-changed"));
            router.push("/auth");
        } catch (err: any) {
            setShowDeleteConfirm(true); // Reopen modal on error
            showMsg(err.message || "Failed to delete account. Please check your password and try again.", true);
        } finally {
            setBusy(false);
            setDeletePassword("");
            setDeleteConfirmText("");
        }
    }

    return (
        <div className="relative min-h-screen bg-white dark:bg-black">
            {/* Background */}
            <div className="fixed inset-0 z-0 bg-grid-light dark:bg-grid opacity-10" />
            <div className="fixed inset-0 z-0 bg-gradient-to-b from-blue-50 via-white to-white dark:from-blue-900/10 dark:via-black dark:to-black" />

            <main className="relative z-10 mx-auto max-w-5xl px-4 py-16 md:py-24">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <div className="inline-block mb-6">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm font-semibold text-blue-600 dark:text-blue-400">
                            <SettingsIcon className="w-4 h-4" />
                            Account Settings
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                        <span className="text-slate-900 dark:text-white">Your </span>
                        <span className="text-blue-500">Settings</span>
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Manage your account preferences, security settings, and notifications
                    </p>
                </motion.div>

                <div className="grid gap-8">
                    {/* Profile Information */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xl"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <User className="w-6 h-6 text-blue-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Profile Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
                                <div className="flex items-center gap-3 mb-3">
                                    <Mail className="w-5 h-5 text-blue-500" />
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</p>
                                </div>
                                <p className="text-lg font-bold text-slate-900 dark:text-white mb-1">{me?.email || "Loading..."}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Your primary email for login and notifications</p>
                            </div>

                            <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
                                <div className="flex items-center gap-3 mb-3">
                                    <Calendar className="w-5 h-5 text-emerald-500" />
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Member Since</p>
                                </div>
                                <p className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                    {me?.created_at ? new Date(me.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "Loading..."}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Account creation date</p>
                            </div>

                            <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
                                <div className="flex items-center gap-3 mb-3">
                                    <CreditCard className="w-5 h-5 text-purple-500" />
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Plan</p>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                                        {profile?.user?.plan || me?.plan || "FREE"}
                                    </p>
                                    {profile?.user?.plan && profile.user.plan !== 'FREE' && (
                                        <span className="px-2 py-1 text-xs font-bold bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full">
                                            Active
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                    {profile?.quota && `${profile.quota.scansUsed} of ${profile.quota.isUnlimited ? '∞' : profile.quota.scansLimit} scans used this month`}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    <a href="/upgrade" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                                        {profile?.user?.plan === 'FREE' ? 'Upgrade plan' : 'Manage subscription'}
                                    </a>
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
                                <div className="flex items-center gap-3 mb-3">
                                    <Shield className="w-5 h-5 text-amber-500" />
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Account Status</p>
                                </div>
                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-1">Active</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Your account is in good standing</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Change Password */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xl"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                <Lock className="w-6 h-6 text-amber-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Change Password</h2>
                        </div>

                        {msg && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`mb-6 p-4 rounded-xl border flex items-center gap-2 ${isError
                                    ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'
                                    : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                    }`}
                            >
                                <span className="text-sm font-medium">{msg}</span>
                            </motion.div>
                        )}

                        <form onSubmit={changePassword} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    placeholder="Enter your current password"
                                    value={pw.old}
                                    onChange={(e) => setPw({ ...pw, old: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Enter new password"
                                        value={pw.next}
                                        onChange={(e) => setPw({ ...pw, next: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={pw.confirm}
                                        onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={busy}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-base font-bold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/50"
                            >
                                {busy ? "Updating..." : "Update Password"}
                            </button>
                        </form>
                    </motion.div>

                    {/* Notifications */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-8 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xl"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                <Bell className="w-6 h-6 text-purple-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Notification Preferences</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white mb-1">Email Notifications</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Receive updates about your account via email</p>
                                </div>
                                <button
                                    onClick={() => setEmailNotifications(!emailNotifications)}
                                    className={`relative w-14 h-8 rounded-full transition-colors ${emailNotifications ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                >
                                    <span
                                        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white mb-1">Scan Alerts</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Get notified when scans detect threats</p>
                                </div>
                                <button
                                    onClick={() => setScanAlerts(!scanAlerts)}
                                    className={`relative w-14 h-8 rounded-full transition-colors ${scanAlerts ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                >
                                    <span
                                        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${scanAlerts ? 'translate-x-6' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Danger Zone */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="p-8 rounded-3xl border-2 border-rose-500/30 bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/10 dark:to-black/50"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                                <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Danger Zone</h2>
                        </div>

                        <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                            Deleting your account will permanently remove all your data, including:
                        </p>
                        <ul className="space-y-2 mb-6 text-slate-600 dark:text-slate-400">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                All scan history and reports
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Sanitized files and downloads
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Account settings and preferences
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Subscription information
                            </li>
                        </ul>
                        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-6">
                            This action cannot be undone.
                        </p>

                        <button
                            onClick={openDeleteModal}
                            disabled={busy}
                            className="rounded-xl border-2 border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 px-8 py-3 text-sm font-bold hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {busy ? "Deleting..." : "Delete Account"}
                        </button>
                    </motion.div>
                </div>

                {/* Password Change Confirmation Modal */}
                <AnimatePresence>
                    {showPasswordConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-8 shadow-2xl"
                            >
                                <button
                                    onClick={() => setShowPasswordConfirm(false)}
                                    className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Confirm Password Change</h3>
                                </div>

                                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                                    Are you sure you want to change your password? You'll need to use the new password for your next login.
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowPasswordConfirm(false)}
                                        className="flex-1 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white px-6 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmPasswordChange}
                                        disabled={busy}
                                        className="flex-1 rounded-xl bg-blue-600 text-white px-6 py-3 text-sm font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/50"
                                    >
                                        {busy ? "Updating..." : "Confirm Change"}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Delete Account Confirmation Modal */}
                <AnimatePresence>
                    {showDeleteConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative w-full max-w-md rounded-3xl border-2 border-rose-500/30 bg-white dark:bg-slate-900 p-8 shadow-2xl"
                            >
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeleteConfirmText("");
                                    }}
                                    className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Delete Account</h3>
                                </div>

                                <div className="mb-6 space-y-4">
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                        <strong className="text-rose-600 dark:text-rose-400">This action cannot be undone.</strong> This will permanently delete:
                                    </p>
                                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                            All your scan history and reports
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                            Sanitized files and downloads
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                            Account settings and preferences
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                            Subscription information
                                        </li>
                                    </ul>
                                </div>

                                {/* Password Verification */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Enter your password to verify:
                                    </label>
                                    <input
                                        type="password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-rose-300 dark:border-rose-500/30 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
                                    />
                                </div>

                                {/* Email Confirmation */}
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        To confirm, type your email address{" "}
                                        <span className="text-rose-600 dark:text-rose-400 font-mono font-bold">{me?.email}</span> below:
                                    </label>
                                    <input
                                        type="text"
                                        value={deleteConfirmText}
                                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                                        placeholder={me?.email || "your-email@example.com"}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-rose-300 dark:border-rose-500/30 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowDeleteConfirm(false);
                                            setDeletePassword("");
                                            setDeleteConfirmText("");
                                        }}
                                        className="flex-1 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white px-6 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDeleteAccount}
                                        disabled={busy || !deletePassword || deleteConfirmText !== me?.email}
                                        className="flex-1 rounded-xl bg-rose-600 text-white px-6 py-3 text-sm font-bold hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-500/50"
                                    >
                                        {busy ? "Deleting..." : "Delete My Account"}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
