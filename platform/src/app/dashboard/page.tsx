"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api, authHeaders } from "@/lib/api";
import { motion } from "framer-motion";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";
import { FiActivity, FiShield, FiAlertTriangle, FiClock, FiFile, FiDownload, FiSearch, FiRefreshCw } from "react-icons/fi";
import { HiChip, HiDocumentText } from "react-icons/hi";
import AuthGuard from "@/components/AuthGuard";

/* --- Helpers --- */
function humanBytes(n: number | string) {
    if (!n && n !== 0) return "0 B";
    const u = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let val = Number(n) || 0;
    while (val >= 1024 && i < u.length - 1) { val /= 1024; i++; }
    return `${val.toFixed(2)} ${u[i]}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-black/80 backdrop-blur-md border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-2xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{new Date(data.created_at).toLocaleString()}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mb-2 truncate max-w-[200px]">{data.filename}</p>
                <div className="flex items-center justify-between gap-4">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${data.verdict?.toLowerCase() === 'malicious' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                        {data.verdict}
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{Math.round(data.risk_score * 100)}% Risk</span>
                </div>
            </div>
        );
    }
    return null;
};



export default function DashboardPage() {
    return (
        <AuthGuard>
            <DashboardContent />
        </AuthGuard>
    );
}

function DashboardContent() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function loadData(isRefresh = false) {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            // Background sync subscription status with Stripe
            const token = typeof window !== 'undefined' ? localStorage.getItem('safedocs_token') : null;
            if (token) {
                fetch('/api/stripe/sync', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(e => console.error('Background sync failed', e));
            }

            const [s, h] = await Promise.all([
                api.me(),
                api.getHistory()
            ]);

            const statsData = await api.getStats().catch(() => ({}));

            setStats(statsData);
            setItems(h.items || []);
            setErr(null);
        } catch (e: any) {
            if (e.status === 401) {
                router.push("/auth");
            } else {
                setErr(e.message || "Failed to load dashboard data.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => { loadData(); }, []);

    const chartData = useMemo(() => {
        return [...items].reverse().slice(-20).map(x => ({
            ...x,
            risk_percent: Math.round((x.risk_score || 0) * 100)
        }));
    }, [items]);

    const downloadFile = async (url: string, fallbackName: string) => {
        try {
            const fullUrl = url.startsWith("/api") ? url : `${api.API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
            const resp = await fetch(fullUrl, { headers: { ...(await authHeaders()) } });
            if (!resp.ok) throw new Error("File missing or expired.");
            const blob = await resp.blob();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = fallbackName;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e: any) {
            alert(e.message);
        }
    };

    if (loading && !err) {
        return (
            <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-white dark:bg-black">
            <div className="fixed inset-0 z-0 bg-grid-light dark:bg-grid opacity-10" />

            <main className="relative z-10 mx-auto max-w-7xl px-4 py-16">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">Security <span className="text-blue-500">Dashboard</span></h1>
                        <p className="mt-2 text-slate-600 dark:text-slate-500">Real-time document security analytics powered by AI</p>
                    </div>
                    <button
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="px-6 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-sm font-bold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <FiRefreshCw className={`text-blue-500 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </header>

                {err && (
                    <div className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm text-center">
                        {err}
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <StatCard
                        icon={<FiSearch className="text-blue-500" />}
                        label="Total Scans"
                        value={stats?.total_scans ?? 0}
                        sub="Documents analyzed"
                    />
                    <StatCard
                        icon={<FiShield className="text-emerald-500" />}
                        label="Safe Files"
                        value={stats?.benign ?? 0}
                        sub="Passed inspection"
                    />
                    <StatCard
                        icon={<FiAlertTriangle className="text-rose-500" />}
                        label="Threats Blocked"
                        value={stats?.malicious ?? 0}
                        sub="Malicious detected"
                    />
                    <StatCard
                        icon={<FiClock className="text-amber-500" />}
                        label="Last Scan"
                        value={stats?.last_activity ? new Date(stats.last_activity).toLocaleDateString() : "Never"}
                        sub="Most recent activity"
                    />
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Trend Chart */}
                    <div className="lg:col-span-2 p-8 rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-sm shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Risk Analysis Trend</h3>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last 20 Scans</span>
                        </div>
                        <div className="h-[300px] w-full" style={{ minHeight: '300px' }}>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-white/10" vertical={false} />
                                        <XAxis
                                            dataKey="created_at"
                                            hide
                                        />
                                        <YAxis
                                            stroke="#64748b"
                                            fontSize={10}
                                            tickFormatter={(v) => `${v}%`}
                                            domain={[0, 100]}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="risk_percent"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorRisk)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center gap-4">
                                    <HiChip className="w-16 h-16 text-slate-300 dark:text-slate-700" />
                                    <p className="text-sm text-slate-500 dark:text-slate-600 italic">No scan data available</p>
                                    <button
                                        onClick={() => router.push('/scan')}
                                        className="mt-2 px-6 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-all"
                                    >
                                        Scan Your First Document
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="p-8 rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-sm shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Recent Activity</h3>
                        <div className="space-y-6">
                            {items.slice(0, 5).map((item, i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${item.verdict?.toLowerCase() === 'malicious' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.filename}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                                            {new Date(item.created_at).toLocaleTimeString()} • {Math.round(item.risk_score * 100)}% Risk
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {items.length === 0 && (
                                <div className="text-center py-8">
                                    <HiDocumentText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                    <p className="text-sm text-slate-500 dark:text-slate-600 italic">No scans yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Full Scan Table */}
                {items.length > 0 && (
                    <section className="mt-12">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Scan History</h3>
                            <span className="text-xs text-slate-500">{items.length} total scans</span>
                        </div>

                        <div className="overflow-x-auto rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.01] shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 dark:bg-white/5">
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date & Time</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Document</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Verdict</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Risk Score</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Download</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-white/[0.05]">
                                    {items.map((item) => (
                                        <tr key={item.scan_id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">{new Date(item.created_at).toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <FiFile className="text-slate-400 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{item.filename}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${item.verdict?.toLowerCase() === 'malicious' ? 'text-rose-500 bg-rose-500/10' : 'text-emerald-500 bg-emerald-500/10'
                                                    }`}>
                                                    {item.verdict}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-1.5 w-16 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                                        <div className={`h-full ${item.verdict?.toLowerCase() === 'malicious' ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${item.risk_score * 100}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">{Math.round(item.risk_score * 100)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    disabled={!item.download_clean_url}
                                                    onClick={() => downloadFile(item.download_clean_url, `Safe_${item.filename}`)}
                                                    className="inline-flex items-center gap-2 text-xs font-bold text-blue-500 hover:text-blue-600 disabled:opacity-30 transition-colors"
                                                >
                                                    <FiDownload /> Download
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

function StatCard({ icon, label, value, sub }: any) {
    return (
        <div className="p-6 rounded-3xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-sm shadow-sm group hover:border-blue-500/50 transition-all">
            <div className="flex items-center gap-4 mb-4">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center transition-transform group-hover:scale-110">
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
                </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">{value}</div>
            <p className="text-[10px] text-slate-500 dark:text-slate-600 font-medium">{sub}</p>
        </div>
    );
}
