"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const faqs = [
        {
            category: "General",
            questions: [
                {
                    q: "What is SafeDocs?",
                    a: "SafeDocs is an AI-powered document security platform that uses advanced machine learning models (LightGBM, MiniLM) to detect malware and threats in your files. We provide real-time scanning and sanitization for documents like PDFs, DOCX, PPTX, XLSX, and RTF files."
                },
                {
                    q: "What file types are supported?",
                    a: "We currently support PDF, DOCX, PPTX, XLSX, and RTF files. The maximum file size is 50MB per upload. We're constantly working to add support for additional file formats."
                },
                {
                    q: "Is my data secure?",
                    a: "Absolutely. We implement a strict zero-retention policy. All files are processed in ephemeral storage and are permanently deleted immediately after scanning. We use end-to-end encryption and isolated processing environments to ensure your data remains private and secure."
                },
                {
                    q: "How does the AI detection work?",
                    a: "Our platform uses a multi-layered approach: LightGBM for gradient boosting-based threat detection, MiniLM for semantic content analysis, and Content Disarm & Reconstruction (CDR) technology to sanitize files by removing potentially malicious elements while preserving the document's integrity."
                }
            ]
        },
        {
            category: "Pricing & Plans",
            questions: [
                {
                    q: "What plans do you offer?",
                    a: "We offer three plans: Free (3 scans/month), Pro ($9.99/month for 100 scans), and Enterprise (unlimited scans with custom pricing). All plans include AI-powered threat detection and CDR sanitization."
                },
                {
                    q: "Can I try before upgrading?",
                    a: "Yes! Our Free plan includes 3 scans per month with no credit card required. You can test all our AI-powered security features before deciding to upgrade."
                },
                {
                    q: "Do you offer educational discounts?",
                    a: "Yes, we provide special pricing for educational institutions and students. Please contact our sales team at sales@safedocs.com for more information about educational plans."
                },
                {
                    q: "How does billing work?",
                    a: "All paid plans are billed monthly. You can upgrade, downgrade, or cancel your subscription at any time. If you cancel, you'll retain access until the end of your billing period."
                }
            ]
        },
        {
            category: "Technical",
            questions: [
                {
                    q: "What is the scan accuracy?",
                    a: "Our LightGBM model achieves 98.5% accuracy in threat detection. The MiniLM embeddings provide additional semantic analysis for a comprehensive security assessment. We continuously train and improve our models with new threat data."
                },
                {
                    q: "How long does a scan take?",
                    a: "Most scans complete within 5-15 seconds depending on file size and complexity. Larger files (40-50MB) may take up to 30 seconds. You'll see real-time progress updates during the scan."
                },
                {
                    q: "Can I integrate SafeDocs with my application?",
                    a: "Yes! Enterprise plans include API access for seamless integration. Contact our sales team to discuss your integration needs and receive API documentation."
                },
                {
                    q: "What happens if a file is flagged as malicious?",
                    a: "If our AI detects threats, you'll receive a detailed report showing the risk score, threat indicators, and recommendations. You can also download a sanitized version of the file with all malicious elements removed via our CDR technology."
                }
            ]
        },
        {
            category: "Support",
            questions: [
                {
                    q: "How do I get support?",
                    a: "You can reach our support team at support@safedocs.com. We typically respond within 24 hours during business days (Monday-Friday). Enterprise customers receive priority support with faster response times."
                },
                {
                    q: "Do you offer phone support?",
                    a: "We primarily provide email support to ensure detailed, quality responses for complex issues. Enterprise customers can request dedicated support channels."
                },
                {
                    q: "Where can I report bugs or request features?",
                    a: "Please email us at support@safedocs.com with bug reports or feature requests. We actively review all feedback and prioritize improvements based on user needs."
                },
                {
                    q: "Is there a knowledge base or documentation?",
                    a: "Yes, we're building comprehensive documentation covering all platform features, API integration, and best practices. Visit our Help Center or contact support for specific guides."
                }
            ]
        }
    ];

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
                            <HelpCircle className="w-4 h-4" />
                            Frequently Asked Questions
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                        <span className="text-slate-900 dark:text-white">How can we </span>
                        <span className="text-blue-500">help?</span>
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Find answers to common questions about SafeDocs, our AI-powered security platform, pricing, and more
                    </p>
                </motion.div>

                {/* FAQ Categories */}
                <div className="space-y-12">
                    {faqs.map((category, catIndex) => (
                        <motion.div
                            key={category.category}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: catIndex * 0.1 }}
                        >
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">{category.category}</h2>
                            <div className="space-y-4">
                                {category.questions.map((faq, qIndex) => {
                                    const globalIndex = faqs.slice(0, catIndex).reduce((acc, cat) => acc + cat.questions.length, 0) + qIndex;
                                    const isOpen = openIndex === globalIndex;

                                    return (
                                        <div
                                            key={qIndex}
                                            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden"
                                        >
                                            <button
                                                onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                                                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                                            >
                                                <span className="text-base font-semibold text-slate-900 dark:text-white pr-4">
                                                    {faq.q}
                                                </span>
                                                <ChevronDown
                                                    className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""
                                                        }`}
                                                />
                                            </button>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="px-6 pb-5 pt-0"
                                                >
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                        {faq.a}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Contact CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-16 p-8 rounded-3xl border-2 border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-center"
                >
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Still have questions?</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Can't find the answer you're looking for? Our support team is here to help.
                    </p>
                    <a
                        href="/contact"
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-base font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/50"
                    >
                        Contact Support
                    </a>
                </motion.div>
            </section>
        </div>
    );
}
