"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowLeft, FiDownload, FiFileText, FiShield, FiCpu, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import { API_BASE, authHeaders } from "@/lib/api";

/* --- Helpers --- */
function percent(v: number | string | undefined | null) {
    const n = typeof v === "number" ? v : (typeof v === "string" ? parseFloat(v) : 0);
    return Math.round(Math.max(0, Math.min(1, isNaN(n) ? 0 : n)) * 100);
}

function humanBytes(n: number | string | undefined | null) {
    if (!n && n !== 0) return "0 B";
    const u = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let val = Number(n) || 0;
    while (val >= 1024 && i < u.length - 1) { val /= 1024; i++; }
    return `${val.toFixed(2)} ${u[i]}`;
}

function resolveApiUrl(u: string | null | undefined) {
    if (!u) return null;
    if (u.startsWith("http")) return u;
    return `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
}

/* --- Main Component --- */
import AuthGuard from "@/components/AuthGuard";

export default function ScanReportPage() {
    return (
        <AuthGuard>
            <ScanReportContent />
        </AuthGuard>
    );
}

function ScanReportContent() {
    const router = useRouter();
    const [rawReport, setRawReport] = useState<any>(null);
    const [rawText, setRawText] = useState("");
    const [showRaw, setShowRaw] = useState(false);
    const [downErr, setDownErr] = useState("");

    const result = useMemo(() => {
        if (typeof window === "undefined") return {};
        const raw = localStorage.getItem("safedocs_last_scan");
        if (!raw) return {};
        try { return JSON.parse(raw); } catch { return {}; }
    }, []);

    useEffect(() => {
        if (!result || Object.keys(result).length === 0) {
            if (typeof window !== "undefined") router.push("/scan");
            return;
        }

        const reportUrlMatch = result.report_api || (result.report_id ? `/api/report/${result.report_id}` : null);
        const url = reportUrlMatch;

        if (url) {
            (async () => {
                try {
                    const resp = await fetch(url, { headers: { ...(await authHeaders()) } });
                    const ctype = resp.headers.get("content-type") || "";
                    if (!resp.ok) {
                        setRawText(`Report sync failed with status ${resp.status}`);
                        return;
                    }
                    if (ctype.includes("application/json")) {
                        setRawReport(await resp.json());
                    } else {
                        setRawText(await resp.text());
                    }
                } catch (e) {
                    setRawText(String(e));
                }
            })();
        }
    }, [result, router]);

    // Derived data
    const meta = result.meta || result.report?.meta || {};
    const name = result._client?.originalName || meta.file || result.filename || "Document";
    const sha = result.sha256 || meta.sha256 || "";

    // Use clean file's risk score if available (after sanitization)
    const wasSanitized = !!(result.sanitized || result.report?.sanitized);
    const originalScore = typeof result.risk_score === "number" ? result.risk_score : (result.report?.risk_score ?? 0);
    const cleanScore = typeof result.clean_risk_score === "number" ? result.clean_risk_score : (result.report?.clean_risk_score ?? originalScore);

    // Display verdict: Prefer clean verdict if sanitized, else original
    const originalVerdict = (result.verdict || (originalScore >= 0.5 ? "malicious" : "benign")).toLowerCase();
    const cleanVerdict = (result.clean_verdict || result.report?.clean_verdict || (cleanScore >= 0.5 ? "malicious" : "benign")).toLowerCase();

    // Final display values
    const score = wasSanitized ? cleanScore : originalScore;
    const verdict = wasSanitized ? cleanVerdict : originalVerdict;
    const isMalicious = verdict === "malicious";
    // Risk level categorization with colors
    const getRiskLevel = (riskScore: number) => {
        if (riskScore >= 0.71) return { level: "CRITICAL", color: "red", bg: "bg-red-500", text: "text-red-500" };
        if (riskScore >= 0.50) return { level: "HIGH", color: "orange", bg: "bg-orange-500", text: "text-orange-500" };
        if (riskScore >= 0.21) return { level: "MEDIUM", color: "yellow", bg: "bg-yellow-500", text: "text-yellow-500" };
        return { level: "LOW", color: "green", bg: "bg-emerald-500", text: "text-emerald-500" };
    };

    const riskLevel = getRiskLevel(score);

    const originalRiskLevel = getRiskLevel(originalScore);
    const cleanRiskLevel = getRiskLevel(cleanScore);
    const currentRiskLevel = getRiskLevel(score);

    // Debug: Log what we're getting
    console.log("📊 Scan result data:", result);
    console.log("📊 Report data:", result.report);
    console.log("📊 Sanitization info:", {
        wasSanitized,
        originalScore,
        cleanScore,
        displayScore: score,
        originalRiskLevel: originalRiskLevel.level,
        cleanRiskLevel: cleanRiskLevel.level,
    });
    console.log("📊 Model scores check:", {
        model_scores: result.model_scores,
        signals: result.signals,
        report_signals: result.report?.signals,
        report_model_scores: result.report?.model_scores
    });

    const sigs = result.model_scores || result.signals || result.report?.signals || result.report?.model_scores || {};
    const scores = [
        { label: "Deep Learning", val: sigs.dl ?? sigs.P_DL ?? 0, color: "from-blue-500 to-indigo-500" },
        { label: "LightGBM", val: sigs.lgbm ?? sigs.P_LGBM ?? 0, color: "from-sky-500 to-blue-500" },
        { label: "Random Forest", val: sigs.tree ?? sigs.P_TREE ?? 0, color: "from-cyan-500 to-sky-500" },
        { label: "Rule Engine", val: sigs.rules ?? sigs.P_RULES ?? 0, color: "from-indigo-500 to-purple-500" },
    ];
    console.log("📊 Extracted scores:", scores);

    const findings = useMemo(() => {
        let raw = [];
        const searchKeys = ["findings", "report_doc.findings", "report.findings"];
        for (const key of searchKeys) {
            let val = result;
            for (const k of key.split('.')) val = val?.[k];
            if (Array.isArray(val) && val.length) { raw = val; break; }
        }
        if (!raw.length && rawReport) {
            raw = rawReport.findings || [];
        }
        return raw.map(f => ({
            title: f.id || f.threat_type || f.title || "Detected Signal",
            message: f.message || f.description || f.indicator || "No description provided.",
            severity: f.severity || "info",
            raw: f
        }));
    }, [result, rawReport]);

    const cleanUrl = result.download_api || result.download_clean_url || (rawReport?.clean_id ? `/api/download/${rawReport.clean_id}` : null);

    const downloadFile = async (url: string | null, fallbackName: string) => {
        if (!url) return;
        setDownErr("");
        try {
            const resp = await fetch(url, { headers: { ...(await authHeaders()) } });
            if (!resp.ok) throw new Error("File generation or retrieval failed.");
            const blob = await resp.blob();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = fallbackName;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e: any) {
            setDownErr(e.message);
        }
    };

    return (
        <div className="relative min-h-screen bg-black">
            <div className="fixed inset-0 z-0 bg-grid opacity-10" />

            <main className="relative z-10 mx-auto max-w-5xl px-4 py-16">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <Link href="/scan" className="inline-flex items-center gap-2 text-xs font-bold text-blue-500 uppercase tracking-widest mb-4 hover:translate-x-1 transition-transform">
                            <FiArrowLeft /> Back to Scan
                        </Link>
                        <h1 className="text-4xl font-extrabold text-white">Analysis <span className="text-blue-500">Report</span></h1>
                        <p className="mt-2 text-slate-500 text-sm font-mono truncate max-w-xl">ID: {result.report_id || result.id || "manual-scan"}</p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => downloadFile(`/api/report/${result.report_id}`, `${name}.report.json`)}
                            className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                            <FiFileText /> JSON Report
                        </button>
                        <button
                            disabled={!cleanUrl}
                            onClick={() => downloadFile(cleanUrl, `Safe_${name}`)}
                            className="px-6 py-2 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
                        >
                            <FiDownload /> {isMalicious ? "Download Sanitized" : "Download Verified"}
                        </button>
                    </div>
                </header>

                {downErr && (
                    <div className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
                        {downErr}
                    </div>
                )}

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Verdict Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-8 rounded-3xl border ${isMalicious ? 'border-rose-500/30 bg-rose-500/5' : 'border-emerald-500/30 bg-emerald-500/5'} backdrop-blur-md shadow-2xl`}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${isMalicious ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                        {isMalicious ? <FiAlertTriangle size={32} /> : <FiCheckCircle size={32} />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase text-white tracking-tight">Verdict: {verdict}</h2>
                                        <p className="text-sm text-slate-400">Analysis completed with {percent(score)}% risk confidence</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-4xl font-black text-white">{percent(score)}%</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Risk Score</span>
                                </div>
                            </div>

                            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent(score)}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-full ${isMalicious ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                />
                            </div>
                        </motion.div>

                        {/* Sanitization status banner */}
                        {wasSanitized && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-5 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between shadow-lg shadow-blue-500/5"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
                                        <FiShield size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-white tracking-tight">Structural Sanitization Applied</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">All active threats have been neutralized. The downloadable file is verified secure.</p>
                                    </div>
                                </div>
                                <div className="hidden md:flex flex-col items-end">
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Status</span>
                                    <span className="px-3 py-1 rounded-full bg-blue-500 text-white text-[10px] font-black shadow-lg shadow-blue-500/30">CDR SECURE</span>
                                </div>
                            </motion.div>
                        )}

                        {/* Findings */}
                        <section>
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <FiShield className="text-blue-500" /> Structural Findings
                            </h3>
                            <div className="space-y-4">
                                {findings.length > 0 ? findings.map((f, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 * i }}
                                        className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="font-bold text-white">{f.title}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest ${f.severity === 'high' ? 'bg-rose-500/20 text-rose-500' :
                                                f.severity === 'medium' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                {f.severity}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400 leading-relaxed">{f.message}</p>
                                    </motion.div>
                                )) : (
                                    <div className="p-12 text-center rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
                                        <p className="text-slate-500 text-sm italic">No suspicious structural markers were identified.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-8">
                        {/* File Metadata */}
                        <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.01]">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">File Details</h3>
                            <dl className="space-y-6">
                                <div>
                                    <dt className="text-xs text-slate-500 mb-1">Name</dt>
                                    <dd className="text-sm font-bold text-white truncate">{name}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-500 mb-1">Size</dt>
                                    <dd className="text-sm font-bold text-white">{humanBytes(meta.size_bytes || meta.size || result.size || 0)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-500 mb-1">Type</dt>
                                    <dd className="text-sm font-bold text-white">{meta.mime_type || result.content_type || "Unknown"}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-500 mb-1">SHA-256</dt>
                                    <dd className="text-[10px] font-mono text-slate-400 break-all bg-black/40 p-2 rounded-lg leading-relaxed">{sha || "N/A"}</dd>
                                </div>
                            </dl>
                        </div>

                        {/* Model Signals */}
                        <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.01]">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Detection Signals</h3>
                            <div className="space-y-6">
                                {scores.map((s, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-xs mb-2">
                                            <span className="text-slate-400">{s.label}</span>
                                            <span className="font-bold text-white">{percent(s.val)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percent(s.val)}%` }}
                                                className={`h-full bg-gradient-to-r ${s.color}`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Privacy Box */}
                        <div className="p-6 rounded-3xl bg-blue-600/5 border border-blue-500/20">
                            <h4 className="text-sm font-bold text-blue-400 mb-2">Retention Notice</h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                This report and its associated download will be automatically purged within 48 hours to ensure maximum privacy.
                            </p>
                        </div>
                    </aside>
                </div>

                {/* Raw View Toggle */}
                <div className="mt-16 pt-8 border-t border-white/5">
                    <button
                        onClick={() => setShowRaw(!showRaw)}
                        className="text-xs font-bold text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-colors mb-6"
                    >
                        {showRaw ? "Collapse Raw Data" : "Inspect Raw Results"}
                    </button>

                    <AnimatePresence>
                        {showRaw && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-8 rounded-3xl bg-black/60 border border-white/5 font-mono text-[11px] overflow-auto max-h-96 text-blue-300">
                                    <pre>{JSON.stringify(rawReport || result, null, 2)}</pre>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
