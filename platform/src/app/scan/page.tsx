"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, File, AlertCircle, CheckCircle, Cpu, Zap, ShieldCheck, FileText } from "lucide-react";


import AuthGuard from "@/components/AuthGuard";

export default function ScanPage() {
    return (
        <AuthGuard>
            <ScanContent />
        </AuthGuard>
    );
}

function ScanContent() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Processing steps with AI terminology
    const processingSteps = [
        { p: 20, d: 500, label: "Uploading & Validating..." },
        { p: 40, d: 1200, label: "LightGBM Analysis..." },
        { p: 60, d: 2000, label: "MiniLM NLP Scan..." },
        { p: 80, d: 3000, label: "CDR Sanitization..." },
        { p: 95, d: 3800, label: "Generating Report..." },
    ];

    useEffect(() => {
        if (!busy) return;
        const timers = processingSteps.map(s => setTimeout(() => {
            setProgress(s.p);
            setCurrentStep(s.label);
        }, s.d));
        return () => timers.forEach(clearTimeout);
    }, [busy]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) {
            if (isValidFile(f)) {
                setFile(f);
                setErr(null);
            } else {
                setErr("Unsupported file type. Please upload PDF, DOCX, PPTX, XLSX, or RTF.");
            }
        }
    }, []);

    const isValidFile = (f: File) => {
        const ext = f.name.split('.').pop()?.toLowerCase();
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (f.size > maxSize) {
            setErr("File too large. Maximum size is 50MB.");
            return false;
        }
        return ext && ['pdf', 'docx', 'pptx', 'xlsx', 'rtf'].includes(ext);
    };

    const handleScan = async (e?: React.FormEvent | React.MouseEvent) => {
        e?.preventDefault();
        if (!file || busy) return;

        setErr(null);
        setBusy(true);
        setProgress(5);
        setCurrentStep("Initializing scan...");

        try {
            const data = await api.scan(file);

            localStorage.setItem("safedocs_last_scan", JSON.stringify({
                ...data,
                _client: { originalName: file.name, ts: Date.now() },
            }));

            if (data?.report_id) {
                localStorage.setItem("safedocs_last_report_id", data.report_id);
            }

            setProgress(100);
            setCurrentStep("Complete!");
            setTimeout(() => router.push("/scanreport"), 500);
        } catch (error: any) {
            if (error.status === 401) {
                router.push("/auth");
            } else {
                setErr(error.message || "Scan failed. Please try again.");
                setBusy(false);
                setProgress(0);
                setCurrentStep("");
            }
        }
    };

    return (
        <div className="relative min-h-screen bg-white dark:bg-black">
            {/* Background */}
            <div className="fixed inset-0 z-0 bg-grid-light dark:bg-grid opacity-10" />
            <div className="fixed inset-0 z-0 bg-gradient-to-b from-blue-50 via-white to-white dark:from-blue-900/10 dark:via-black dark:to-black" />

            <section className="relative z-10 mx-auto max-w-5xl px-4 py-16 md:py-20">
                {/* Header */}
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-block mb-4"
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm font-semibold text-blue-600 dark:text-blue-400">
                            <Cpu className="w-4 h-4" />
                            AI-Powered Threat Detection
                        </span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4"
                    >
                        <span className="text-slate-900 dark:text-white">Scan & </span>
                        <span className="text-blue-500">Protect</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto"
                    >
                        Upload your document for intelligent malware detection using LightGBM and MiniLM AI models
                    </motion.p>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                    {err && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-500/5 p-4 flex items-center gap-3 text-rose-600 dark:text-rose-400"
                        >
                            <AlertCircle className="flex-shrink-0 w-5 h-5" />
                            <span className="text-sm font-medium">{err}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Upload Area */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    className={`relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 shadow-xl ${dragOver
                        ? "border-blue-500 bg-blue-500/10 scale-[1.02]"
                        : "border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                        }`}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f && isValidFile(f)) {
                                setFile(f);
                                setErr(null);
                            }
                        }}
                        accept=".pdf,.docx,.pptx,.xlsx,.rtf"
                    />

                    <div className="p-12 md:p-20 flex flex-col items-center text-center">
                        <AnimatePresence mode="wait">
                            {!file ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-500/20 dark:to-blue-600/10 flex items-center justify-center mb-6 shadow-lg dark:shadow-blue-500/20">
                                        <UploadCloud className="h-12 w-12 text-white dark:text-blue-500" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Drop your document here</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-500 mb-8 max-w-md">
                                        Supports PDF, DOCX, PPTX, XLSX, RTF • Maximum 50MB
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => inputRef.current?.click()}
                                        className="rounded-full bg-blue-600 hover:bg-blue-500 px-10 py-4 text-base font-bold text-white transition-all transform hover:scale-105 shadow-lg shadow-blue-600/50"
                                    >
                                        Choose File
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="selected"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center w-full"
                                >
                                    <div className="h-24 w-24 rounded-3xl bg-blue-500/20 dark:bg-blue-500/10 flex items-center justify-center mb-6 border-2 border-blue-500/30">
                                        <File className="h-12 w-12 text-blue-500" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 truncate max-w-md">{file.name}</h3>
                                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-8 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        {(file.size / 1024 / 1024).toFixed(2)} MB • Ready for AI analysis
                                    </p>

                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={() => { setFile(null); setErr(null); }}
                                            disabled={busy}
                                            className="rounded-full border-2 border-slate-300 dark:border-white/10 px-8 py-3 text-base font-bold text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 transition-all"
                                        >
                                            Remove
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleScan}
                                            disabled={busy}
                                            className="rounded-full bg-blue-600 px-10 py-3 text-base font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/50 disabled:opacity-50 transition-all transform hover:scale-105"
                                        >
                                            {busy ? "Analyzing..." : "Start Scan"}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Progress Bar */}
                    {busy && (
                        <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-white dark:from-black to-transparent">
                            <div className="h-2 w-full bg-slate-200 dark:bg-white/5 overflow-hidden rounded-full mb-4">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                                    animate={{ width: `${progress}%` }}
                                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-blue-600 dark:text-blue-400">{currentStep}</span>
                                <span className="font-bold text-slate-600 dark:text-slate-400">{progress}%</span>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Features Grid */}
                <div className="mt-16 grid gap-6 md:grid-cols-3">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.01] shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                            <Cpu className="h-6 w-6 text-blue-500" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">LightGBM Detection</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-500 leading-relaxed">
                            Advanced gradient boosting ML model analyzes document structure and metadata for malicious patterns
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.01] shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-4">
                            <Zap className="h-6 w-6 text-yellow-500" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">MiniLM NLP Analysis</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-500 leading-relaxed">
                            Deep learning transformer model performs semantic content inspection for hidden threats
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.01] shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                            <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">CDR Sanitization</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-500 leading-relaxed">
                            Content Disarm & Reconstruction technology removes threats while preserving document integrity
                        </p>
                    </motion.div>
                </div>

                {/* Security Note */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mt-12 p-6 rounded-2xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5"
                >
                    <div className="flex items-start gap-4">
                        <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">Zero Data Retention Policy</h4>
                            <p className="text-xs text-blue-700 dark:text-blue-400/80 leading-relaxed">
                                Your files are never permanently stored. All original and intermediate data is automatically purged after analysis. Only sanitized, threat-free versions are made available for download.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}
