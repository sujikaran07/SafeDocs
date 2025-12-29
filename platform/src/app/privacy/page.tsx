"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Eye, Database, UserCheck, FileText } from "lucide-react";

export default function Privacy() {
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
                            <Shield className="w-4 h-4" />
                            Privacy Policy
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                        <span className="text-slate-900 dark:text-white">Your Privacy </span>
                        <span className="text-blue-500">Matters</span>
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-2">
                        We're committed to protecting your data and being transparent about how we collect, use, and safeguard your information.
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                        Last updated: December 23, 2024
                    </p>
                </motion.div>

                {/* Section 1 */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white pt-2">Information We Collect</h2>
                    </div>
                    <div className="ml-16 space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <p>When you use SafeDocs, we collect the following information:</p>
                        <ul className="space-y-2">
                            <li><strong className="text-slate-900 dark:text-white">Account Information:</strong> Name, email address, and company name when you create an account</li>
                            <li><strong className="text-slate-900 dark:text-white">Payment Information:</strong> Billing details processed securely through our payment provider (we never store full credit card numbers)</li>
                            <li><strong className="text-slate-900 dark:text-white">Usage Data:</strong> Information about how you use our platform, including scan frequency and file types</li>
                            <li><strong className="text-slate-900 dark:text-white">Technical Data:</strong> IP address, browser type, device information, and log data for security and performance purposes</li>
                        </ul>
                        <p className="pt-2"><strong className="text-slate-900 dark:text-white">We do NOT collect or retain the actual content of your uploaded files beyond the scanning process.</strong></p>
                    </div>
                </motion.div>

                {/* Section 2 */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Database className="w-6 h-6 text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white pt-2">How We Use Your Information</h2>
                    </div>
                    <div className="ml-16 space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <p>We use the collected information to:</p>
                        <ul className="space-y-2">
                            <li>• Provide, maintain, and improve our document security services</li>
                            <li>• Process your scans and deliver threat detection results</li>
                            <li>• Send you account notifications, security alerts, and service updates</li>
                            <li>• Respond to your support requests and communicate with you</li>
                            <li>• Prevent fraud, abuse, and security incidents</li>
                            <li>• Comply with legal obligations and enforce our Terms of Service</li>
                            <li>• Analyze usage patterns to enhance platform performance and features</li>
                        </ul>
                    </div>
                </motion.div>

                {/* Section 3 - Zero Retention */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8 rounded-2xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-black/50 p-8">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white pt-2">Zero-Retention File Policy</h2>
                    </div>
                    <div className="ml-16 space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">Your document security and privacy are our top priorities.</p>
                        <ul className="space-y-2">
                            <li>• All uploaded files are processed in ephemeral, isolated storage environments</li>
                            <li>• Files are <strong className="text-slate-900 dark:text-white">permanently deleted immediately</strong> after scanning is complete (typically within seconds)</li>
                            <li>• We do not store, backup, or retain any copies of your documents</li>
                            <li>• Sanitized files are available for download for 24 hours, then permanently deleted</li>
                            <li>• Our AI models analyze document characteristics without storing actual content</li>
                            <li>• All file processing occurs in encrypted, secure containers</li>
                        </ul>
                    </div>
                </motion.div>

                {/* Section 4 */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-6 h-6 text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white pt-2">Data Security</h2>
                    </div>
                    <div className="ml-16 space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <p>We implement industry-standard security measures:</p>
                        <ul className="space-y-2">
                            <li><strong className="text-slate-900 dark:text-white">Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
                            <li><strong className="text-slate-900 dark:text-white">Access Controls:</strong> Strict role-based access with multi-factor authentication for our staff</li>
                            <li><strong className="text-slate-900 dark:text-white">Infrastructure:</strong> Secure cloud infrastructure with regular security audits and penetration testing</li>
                            <li><strong className="text-slate-900 dark:text-white">Monitoring:</strong> 24/7 security monitoring and automated threat detection</li>
                            <li><strong className="text-slate-900 dark:text-white">Incident Response:</strong> Dedicated security team with established incident response procedures</li>
                            <li><strong className="text-slate-900 dark:text-white">Compliance:</strong> Regular third-party security assessments and compliance certifications</li>
                        </ul>
                    </div>
                </motion.div>

                {/* Section 5 */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Eye className="w-6 h-6 text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white pt-2">Data Sharing</h2>
                    </div>
                    <div className="ml-16 space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <p><strong className="text-slate-900 dark:text-white">We do NOT sell your personal information to third parties.</strong></p>
                        <p>We may share your information only in these limited circumstances:</p>
                        <ul className="space-y-2">
                            <li><strong className="text-slate-900 dark:text-white">Service Providers:</strong> Trusted partners who help us operate our platform (payment processors, cloud infrastructure providers) under strict confidentiality agreements</li>
                            <li><strong className="text-slate-900 dark:text-white">Legal Requirements:</strong> When required by law, court order, or government regulation</li>
                            <li><strong className="text-slate-900 dark:text-white">Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets (users will be notified)</li>
                            <li><strong className="text-slate-900 dark:text-white">With Your Consent:</strong> When you explicitly authorize us to share information</li>
                        </ul>
                        <p className="pt-2">All third parties are contractually obligated to protect your data and use it only for specified purposes.</p>
                    </div>
                </motion.div>

                {/* Section 6 */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mb-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <UserCheck className="w-6 h-6 text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white pt-2">Your Rights</h2>
                    </div>
                    <div className="ml-16 space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <p>You have the following rights regarding your personal information:</p>
                        <ul className="space-y-2">
                            <li><strong className="text-slate-900 dark:text-white">Access:</strong> Request a copy of your personal data we hold</li>
                            <li><strong className="text-slate-900 dark:text-white">Correction:</strong> Update or correct inaccurate information</li>
                            <li><strong className="text-slate-900 dark:text-white">Deletion:</strong> Request deletion of your account and associated data</li>
                            <li><strong className="text-slate-900 dark:text-white">Portability:</strong> Receive your data in a machine-readable format</li>
                            <li><strong className="text-slate-900 dark:text-white">Opt-Out:</strong> Unsubscribe from marketing communications at any time</li>
                            <li><strong className="text-slate-900 dark:text-white">Objection:</strong> Object to certain data processing activities</li>
                        </ul>
                        <p className="pt-2">To exercise these rights, contact us at privacy@safedocs.com. We'll respond within 30 days.</p>
                    </div>
                </motion.div>

                {/* Additional Sections */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="space-y-8">
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Cookies and Tracking</h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            We use essential cookies to maintain your session and preferences. We also use analytics cookies to understand platform usage and improve our services. You can control cookie preferences in your browser settings.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Children's Privacy</h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            SafeDocs is not intended for users under 13 years of age. We do not knowingly collect personal information from children. If you believe we've collected information from a child, please contact us immediately.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Changes to This Policy</h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            We may update this Privacy Policy periodically. We'll notify you of significant changes via email or through the platform. Your continued use of SafeDocs after changes constitutes acceptance of the updated policy.
                        </p>
                    </div>
                </motion.div>

                {/* Contact */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-12 p-8 rounded-3xl border-2 border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Questions About Privacy?</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        If you have any questions about this Privacy Policy or our data practices, please contact us.
                    </p>
                    <a href="mailto:privacy@safedocs.com" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-base font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/50">
                        Contact Privacy Team
                    </a>
                </motion.div>
            </section>
        </div>
    );
}
