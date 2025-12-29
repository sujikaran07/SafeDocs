"use client";

import { motion } from "framer-motion";
import { FileText, AlertCircle, Scale, Users, Ban, RefreshCw } from "lucide-react";

export default function Terms() {
    return (
        <div className="relative min-h-screen bg-white dark:bg-black">
            {/* Background */}
            <div className="fixed inset-0 z-0 bg-grid-light dark:bg-grid opacity-10" />
            <div className="fixed inset-0 z-0 bg-gradient-to-b from-blue-50 via-white to-white dark:from-blue-900/10 dark:via-black dark:to-black" />

            <section className="relative z-10 mx-auto max-w-4xl px-4 py-16 md:py-24">
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-block mb-6">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm font-semibold text-blue-600 dark:text-blue-400">
                            <Scale className="w-4 h-4" />
                            Terms of Service
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                        <span className="text-slate-900 dark:text-white">Terms of </span>
                        <span className="text-blue-500">Service</span>
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-2">
                        Please read these terms carefully before using SafeDocs. They govern your use of our AI-powered document security platform.
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                        Last updated: December 23, 2024
                    </p>
                </motion.div>

                {/* Section 1 */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Users className="w-6 h-6 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white pt-2">1. Acceptance of Terms</h2>
                    </div>
                    <div className="ml-16 space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <p>By accessing or using SafeDocs ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.</p>
                        <p>These Terms constitute a legally binding agreement between you and SafeDocs. We reserve the right to modify these Terms at any time, and your continued use of the Service constitutes acceptance of such modifications.</p>
                    </div>
                </motion.div>

                {/* Section 2 */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white pt-2">2. Service Description</h2>
                    </div>
                    <div className="ml-16 space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <p>SafeDocs provides AI-powered document security services including:</p>
                        <ul className="space-y-2">
                            <li>• Malware and threat detection using machine learning models (LightGBM, MiniLM)</li>
                            <li>• Content Disarm & Reconstruction (CDR) technology for file sanitization</li>
                            <li>• Real-time document scanning and risk assessment</li>
                            <li>• Secure file processing with zero-retention policy</li>
                        </ul>
                        <p className="pt-2"><strong className="text-slate-900 dark:text-white">Service Limitations:</strong></p>
                        <ul className="space-y-2">
                            <li>• Maximum file size: 50MB per upload</li>
                            <li>• Supported formats: PDF, DOCX, PPTX, XLSX, RTF</li>
                            <li>• Scan quotas based on your subscription plan</li>
                            <li>• Service availability subject to maintenance and updates</li>
                        </ul>
                    </div>
                </motion.div>

                {/* Section 3 */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Scale className="w-6 h-6 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white pt-2">3. User Responsibilities</h2>
                    </div>
                    <div className="ml-16 space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <p>By using SafeDocs, you agree to:</p>
                        <ul className="space-y-2">
                            <li>• Provide accurate account information and keep it updated</li>
                            <li>• Maintain the security and confidentiality of your account credentials</li>
                            <li>• Use the Service only for lawful purposes and in compliance with applicable laws</li>
                            <li>• Not upload files containing illegal, harmful, or copyrighted content without authorization</li>
                            <li>• Not attempt to circumvent, disable, or interfere with security features</li>
                            <li>• Not use the Service to scan files you don't have the right to access</li>
                            <li>• Not reverse engineer, decompile, or extract our AI models or algorithms</li>
                            <li>• Not resell, redistribute, or sublicense access to the Service without permission</li>
                        </ul>
                    </div>
                </motion.div>

                {/* Section 4 */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white pt-2">4. Data and Privacy</h2>
                    </div>
                    <div className="ml-16 space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white mb-2">Zero-Retention Policy:</p>
                            <p>All uploaded files are processed in ephemeral storage and permanently deleted immediately after scanning. We do not retain, store, or backup your documents.</p>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white mb-2">Data Ownership:</p>
                            <p>You retain all rights to your uploaded files. We claim no ownership over your content.</p>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white mb-2">Privacy:</p>
                            <p>Our Privacy Policy governs how we collect, use, and protect your personal information. By using SafeDocs, you consent to our Privacy Policy.</p>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white mb-2">Security:</p>
                            <p>While we implement industry-standard security measures, no system is 100% secure. You acknowledge that you use the Service at your own risk.</p>
                        </div>
                    </div>
                </motion.div>

                {/* Section 5 */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <RefreshCw className="w-6 h-6 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white pt-2">5. Subscription and Billing</h2>
                    </div>
                    <div className="ml-16 space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white mb-2">Plans:</p>
                            <ul className="space-y-1">
                                <li>• Free Plan: 3 scans/month, no credit card required</li>
                                <li>• Pro Plan: $9.99/month, 100 scans/month</li>
                                <li>• Enterprise Plan: Custom pricing, unlimited scans</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white mb-2">Billing:</p>
                            <ul className="space-y-1">
                                <li>• All paid subscriptions are billed monthly in advance</li>
                                <li>• Prices are subject to change with 30 days' notice</li>
                                <li>• You're responsible for all charges associated with your account</li>
                                <li>• Failed payments may result in service suspension</li>
                                <li>• Refunds are provided at our discretion for service failures</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white mb-2">Cancellation:</p>
                            <ul className="space-y-1">
                                <li>• You may cancel your subscription at any time</li>
                                <li>• Cancellation takes effect at the end of the current billing period</li>
                                <li>• No refunds for partial months</li>
                                <li>• Upon cancellation, your account reverts to the Free plan</li>
                            </ul>
                        </div>
                    </div>
                </motion.div>

                {/* Section 6 */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mb-8 rounded-2xl border-2 border-rose-500/30 bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/10 dark:to-black/50 p-8">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                            <Ban className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white pt-2">6. Prohibited Uses</h2>
                    </div>
                    <div className="ml-16 space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <p className="font-semibold text-slate-900 dark:text-white">You may NOT use SafeDocs to:</p>
                        <ul className="space-y-2">
                            <li>• Scan files containing child exploitation material or illegal content</li>
                            <li>• Conduct security testing or penetration testing without written permission</li>
                            <li>• Upload malware with intent to distribute, test evasion techniques, or weaponize threats</li>
                            <li>• Scan files you don't have legal authorization to access</li>
                            <li>• Violate any laws, regulations, or third-party rights</li>
                            <li>• Interfere with or disrupt the Service or servers</li>
                            <li>• Use automated systems to access the Service without permission (except for authorized API access)</li>
                            <li>• Misrepresent your identity or affiliation</li>
                            <li>• Attempt to gain unauthorized access to other users' accounts</li>
                        </ul>
                        <p className="pt-2 font-semibold text-rose-600 dark:text-rose-400">Violations may result in immediate account termination and legal action.</p>
                    </div>
                </motion.div>

                {/* Additional Sections */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="space-y-8">
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">7. Intellectual Property</h2>
                        <div className="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                            <p>All content, features, and functionality of SafeDocs (including but not limited to AI models, algorithms, software, text, graphics, logos, and trademarks) are owned by SafeDocs and protected by copyright, trademark, and other intellectual property laws.</p>
                            <p>You may not copy, modify, distribute, sell, or lease any part of our Service or included software without explicit written permission.</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">8. Disclaimers and Limitations of Liability</h2>
                        <div className="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white mb-2">Service "As Is":</p>
                                <p>SafeDocs is provided "as is" without warranties of any kind, either express or implied. We do not guarantee that the Service will be error-free, uninterrupted, or free from viruses.</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white mb-2">AI Limitations:</p>
                                <p>While our AI models achieve high accuracy, no automated system is perfect. SafeDocs does not guarantee 100% threat detection. You remain responsible for validating file safety.</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white mb-2">Limitation of Liability:</p>
                                <p>To the maximum extent permitted by law, SafeDocs shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, revenue, or profits, arising from your use of the Service.</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white mb-2">Maximum Liability:</p>
                                <p>Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">9. Termination</h2>
                        <div className="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                            <p>We reserve the right to suspend or terminate your access to SafeDocs at any time, with or without notice, for:</p>
                            <ul className="space-y-2">
                                <li>• Violation of these Terms</li>
                                <li>• Fraudulent or illegal activity</li>
                                <li>• Abuse of the Service</li>
                                <li>• Non-payment of fees</li>
                                <li>• Any reason at our discretion</li>
                            </ul>
                            <p className="pt-2">Upon termination, your right to use the Service ceases immediately. All provisions of these Terms that should reasonably survive termination shall remain in effect.</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">10. Governing Law and Disputes</h2>
                        <div className="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                            <p>These Terms are governed by the laws of the jurisdiction in which SafeDocs operates, without regard to conflict of law principles.</p>
                            <p>Any disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration, except where prohibited by law.</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">11. Contact</h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            For questions about these Terms, please contact us at{" "}
                            <a href="mailto:legal@safedocs.com" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                                legal@safedocs.com
                            </a>
                        </p>
                    </div>
                </motion.div>

                {/* Contact CTA */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-12 p-8 rounded-3xl border-2 border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Questions About These Terms?</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        If you have any questions or concerns, our legal team is here to help.
                    </p>
                    <a href="mailto:legal@safedocs.com" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-base font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/50">
                        Contact Legal Team
                    </a>
                </motion.div>
            </section>
        </div>
    );
}
