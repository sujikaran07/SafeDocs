"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle, AlertTriangle, Info, Trash2, Check, X, Filter, ShieldAlert, FileText, Settings, CreditCard } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

export default function NotificationsPage() {
    return (
        <AuthGuard>
            <NotificationsContent />
        </AuthGuard>
    );
}

// Notification types
type NotificationType = "scan" | "security" | "account" | "billing" | "system";

interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    link?: string;
}

function NotificationsContent() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<NotificationType | "all">("all");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | "all" | null>(null);

    // Initialize with sample notifications (replace with API call)
    useEffect(() => {
        const sampleNotifications: Notification[] = [
            {
                id: "1",
                type: "scan",
                title: "Malicious File Detected",
                message: "document.pdf was flagged as malicious with a 95% threat score. Review the scan report for details.",
                timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
                read: false,
                link: "/dashboard"
            },
            {
                id: "2",
                type: "scan",
                title: "Scan Complete - File Safe",
                message: "report.docx has been scanned successfully. No threats detected. Sanitized version is ready for download.",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
                read: false,
                link: "/dashboard"
            },
            {
                id: "3",
                type: "security",
                title: "Password Changed Successfully",
                message: "Your account password was updated. If this wasn't you, please contact support immediately.",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
                read: true
            },
            {
                id: "4",
                type: "account",
                title: "Welcome to SafeDocs!",
                message: "Your account has been created successfully. Start scanning documents to detect threats.",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
                read: true,
                link: "/scan"
            },
            {
                id: "5",
                type: "billing",
                title: "Subscription Renewed",
                message: "Your Pro plan subscription has been renewed for $9.99. Thank you for using SafeDocs!",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
                read: true
            },
            {
                id: "6",
                type: "system",
                title: "New Features Available",
                message: "We've added enhanced PDF sanitization with improved malware detection. Check it out!",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 2 weeks ago
                read: true,
                link: "/scan"
            }
        ];
        setNotifications(sampleNotifications);
    }, []);

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case "scan":
                return <FileText className="w-5 h-5" />;
            case "security":
                return <ShieldAlert className="w-5 h-5" />;
            case "account":
                return <Settings className="w-5 h-5" />;
            case "billing":
                return <CreditCard className="w-5 h-5" />;
            case "system":
                return <Info className="w-5 h-5" />;
        }
    };

    const getColor = (type: NotificationType) => {
        switch (type) {
            case "scan":
                return "blue";
            case "security":
                return "rose";
            case "account":
                return "purple";
            case "billing":
                return "emerald";
            case "system":
                return "amber";
        }
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
    };

    const deleteAllRead = () => {
        setNotifications(prev => prev.filter(n => !n.read));
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
    };

    const confirmDelete = () => {
        if (deleteTarget === "all") {
            deleteAllRead();
        } else if (deleteTarget) {
            deleteNotification(deleteTarget);
        }
    };

    const openDeleteConfirm = (target: string | "all") => {
        setDeleteTarget(target);
        setShowDeleteConfirm(true);
    };

    const filteredNotifications = filter === "all"
        ? notifications
        : notifications.filter(n => n.type === filter);

    const unreadCount = notifications.filter(n => !n.read).length;

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="relative min-h-screen bg-white dark:bg-black">
            {/* Background */}
            <div className="fixed inset-0 z-0 bg-grid-light dark:bg-grid opacity-10" />
            <div className="fixed inset-0 z-0 bg-gradient-to-b from-blue-50 via-white to-white dark:from-blue-900/10 dark:via-black dark:to-black" />

            <main className="relative z-10 mx-auto max-w-4xl px-4 py-16 md:py-24">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <div className="inline-block mb-6">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm font-semibold text-blue-600 dark:text-blue-400">
                            <Bell className="w-4 h-4" />
                            {unreadCount > 0 && `${unreadCount} Unread`}
                            {unreadCount === 0 && "All Caught Up"}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                        <span className="text-slate-900 dark:text-white">Notifications</span>
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Stay updated with your scan results, security alerts, and account activities
                    </p>
                </motion.div>

                {/* Actions Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setFilter("all")}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === "all"
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                                }`}
                        >
                            All ({notifications.length})
                        </button>
                        <button
                            onClick={() => setFilter("scan")}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === "scan"
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                                }`}
                        >
                            Scans
                        </button>
                        <button
                            onClick={() => setFilter("security")}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === "security"
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                                }`}
                        >
                            Security
                        </button>
                        <button
                            onClick={() => setFilter("account")}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === "account"
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                                }`}
                        >
                            Account
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                            >
                                Mark All Read
                            </button>
                        )}
                        {notifications.some(n => n.read) && (
                            <button
                                onClick={() => openDeleteConfirm("all")}
                                className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-500/20 transition-all"
                            >
                                Clear Read
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Notifications List */}
                <div className="space-y-4">
                    <AnimatePresence>
                        {filteredNotifications.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-16"
                            >
                                <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                                <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No notifications</p>
                                <p className="text-slate-600 dark:text-slate-400">You're all caught up!</p>
                            </motion.div>
                        )}

                        {filteredNotifications.map((notification, index) => {
                            const color = getColor(notification.type);
                            const colorClasses = {
                                blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                rose: "bg-rose-500/10 text-rose-500 border-rose-500/20",
                                purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
                                emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                amber: "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            };

                            return (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`p-6 rounded-2xl border ${notification.read
                                            ? "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                                            : "border-blue-500/30 bg-blue-50 dark:bg-blue-500/5"
                                        } shadow-sm hover:shadow-md transition-all cursor-pointer group`}
                                    onClick={() => {
                                        if (!notification.read) markAsRead(notification.id);
                                        if (notification.link) router.push(notification.link);
                                    }}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}>
                                            {getIcon(notification.type)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {notification.title}
                                                </h3>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {!notification.read && (
                                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openDeleteConfirm(notification.id);
                                                        }}
                                                        className="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-500">
                                                    {formatTime(notification.timestamp)}
                                                </span>
                                                {notification.link && (
                                                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                                        Click to view →
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Delete Confirmation Modal */}
                <AnimatePresence>
                    {showDeleteConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-8 shadow-2xl"
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {deleteTarget === "all" ? "Clear Read Notifications" : "Delete Notification"}
                                    </h3>
                                </div>

                                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                                    {deleteTarget === "all"
                                        ? "Are you sure you want to delete all read notifications? This action cannot be undone."
                                        : "Are you sure you want to delete this notification? This action cannot be undone."}
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowDeleteConfirm(false);
                                            setDeleteTarget(null);
                                        }}
                                        className="flex-1 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white px-6 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="flex-1 rounded-xl bg-rose-600 text-white px-6 py-3 text-sm font-bold hover:bg-rose-500 transition-all shadow-lg shadow-rose-500/50"
                                    >
                                        Delete
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
