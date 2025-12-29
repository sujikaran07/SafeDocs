"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Zap, Users, Heart } from "lucide-react";

export default function About() {
    return (
        <div className="relative min-h-screen bg-white dark:bg-black">
            {/* Background */}
            <div className="fixed inset-0 z-0 bg-grid-light dark:bg-grid opacity-10" />
            <div className="fixed inset-0 z-0 bg-gradient-to-b from-blue-50 via-white to-white dark:from-blue-900/10 dark:via-black dark:to-black" />

            <section className="relative z-10 mx-auto max-w-5xl px-4 py-16 md:py-24">
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-20"
                >
                    <div className="inline-block mb-6">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm font-semibold text-blue-600 dark:text-blue-400">
                            <Heart className="w-4 h-4" />
                            Our Story
                        </span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
                        <span className="text-slate-900 dark:text-white">About </span>
                        <span className="text-blue-500">SafeDocs</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto leading-relaxed">
                        Building the future of document security through artificial intelligence
                    </p>
                </motion.div>

                {/* Mission */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-24"
                >
                    <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-10 md:p-16">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-6 text-center">
                            Our Mission
                        </h2>
                        <div className="prose prose-lg dark:prose-invert mx-auto max-w-3xl">
                            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed text-center mb-6">
                                In an era where cyber threats evolve daily, document-borne malware remains one of the most common attack vectors. Traditional antivirus solutions often fail to detect sophisticated threats hidden in PDFs, Office documents, and other files.
                            </p>
                            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed text-center">
                                <strong className="text-blue-600 dark:text-blue-400">SafeDocs</strong> was created to solve this problem. We believe that AI and machine learning are the key to staying ahead of evolving threats. Our platform combines cutting-edge technology with a commitment to privacy and security, ensuring your documents are always safe.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Values */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-24"
                >
                    <h2 className="text-4xl md:text-5xl font-extrabold text-center text-slate-900 dark:text-white mb-4">
                        Our <span className="text-blue-500">Values</span>
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400 text-center max-w-2xl mx-auto mb-16">
                        The principles that guide everything we do
                    </p>

                    <div className="grid gap-8 md:grid-cols-3">
                        <ValueCard
                            icon={<ShieldCheck className="w-10 h-10" />}
                            title="Security First"
                            description="We prioritize the security and privacy of your data above all else. Zero retention, complete encryption, and isolated processing."
                        />
                        <ValueCard
                            icon={<Zap className="w-10 h-10" />}
                            title="Innovation"
                            description="We leverage the latest AI and ML technologies to stay ahead of emerging threats and provide best-in-class protection."
                        />
                        <ValueCard
                            icon={<Users className="w-10 h-10" />}
                            title="User-Centric"
                            description="Security shouldn't be complicated. We build intuitive, accessible tools that anyone can use to protect their documents."
                        />
                    </div>
                </motion.div>

                {/* Technology */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mb-24"
                >
                    <div className="rounded-3xl border-2 border-blue-500/20 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-500/10 dark:via-black dark:to-blue-500/5 p-10 md:p-16">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-6 text-center">
                            Built on Advanced AI
                        </h2>
                        <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed text-center max-w-3xl mx-auto mb-10">
                            Our platform is powered by state-of-the-art machine learning models including <strong className="text-blue-600 dark:text-blue-400">LightGBM gradient boosting</strong> and <strong className="text-blue-600 dark:text-blue-400">MiniLM transformer models</strong>, combined with advanced <strong className="text-blue-600 dark:text-blue-400">Content Disarm & Reconstruction (CDR)</strong> technology.
                        </p>
                        <div className="grid gap-6 md:grid-cols-3 text-center">
                            <TechStat number="99.8%" label="Detection Accuracy" />
                            <TechStat number="<2s" label="Average Scan Time" />
                            <TechStat number="0" label="Data Retention" />
                        </div>
                    </div>
                </motion.div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center"
                >
                    <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-6">
                        Ready to Experience SafeDocs?
                    </h3>
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
                        Join thousands of users protecting their documents with AI-powered security
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="/scan"
                            className="inline-flex items-center justify-center gap-2 rounded-full px-10 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all transform hover:scale-105 shadow-xl shadow-blue-500/50"
                        >
                            Try It Now
                        </a>
                        <a
                            href="/contact"
                            className="inline-flex items-center justify-center gap-2 rounded-full px-10 py-4 text-base font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-500 transition-all"
                        >
                            Contact Us
                        </a>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}

// Value Card
function ValueCard({ icon, title, description }: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="group p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-blue-500/50 dark:hover:border-blue-500/30 transition-all"
        >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white mb-6 shadow-lg shadow-blue-500/50 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
        </motion.div>
    );
}

// Tech Stat
function TechStat({ number, label }: { number: string; label: string }) {
    return (
        <div className="p-6">
            <div className="text-4xl md:text-5xl font-black text-blue-600 dark:text-blue-400 mb-2">
                {number}
            </div>
            <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                {label}
            </div>
        </div>
    );
}
