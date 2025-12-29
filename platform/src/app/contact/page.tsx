"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Send, Check, AlertCircle, MessageSquare, HelpCircle, CreditCard, Shield, Clock } from "lucide-react";

export default function Contact() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        company: "",
        subject: "",
        message: "",
        type: "general"
    });
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    function change(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
        setError("");
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name || !form.email || !form.message) {
            setError("Please fill in all required fields");
            return;
        }
        setSent(true);
        setTimeout(() => {
            setSent(false);
            setForm({ name: "", email: "", company: "", subject: "", message: "", type: "general" });
        }, 4000);
    }

    return (
        <div className="relative min-h-screen bg-white dark:bg-black">
            {/* Background */}
            <div className="fixed inset-0 z-0 bg-grid-light dark:bg-grid opacity-10" />
            <div className="fixed inset-0 z-0 bg-gradient-to-b from-blue-50 via-white to-white dark:from-blue-900/10 dark:via-black dark:to-black" />

            <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 md:py-24">
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-block mb-6">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm font-semibold text-blue-600 dark:text-blue-400">
                            <MessageSquare className="w-4 h-4" />
                            We're Here to Help
                        </span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
                        <span className="text-slate-900 dark:text-white">Get in </span>
                        <span className="text-blue-500">Touch</span>
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Have questions about SafeDocs? Our team is ready to help with sales, support, or any inquiries.
                    </p>
                </motion.div>

                {/* Contact Options - Improved Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                    <ContactCard
                        icon={<CreditCard className="w-8 h-8" />}
                        title="Sales & Pricing"
                        description="Questions about plans and enterprise pricing"
                        email="sales@safedocs.com"
                        color="blue"
                        delay={0.1}
                    />
                    <ContactCard
                        icon={<HelpCircle className="w-8 h-8" />}
                        title="Technical Support"
                        description="Help with your account or scanning issues"
                        email="support@safedocs.com"
                        color="emerald"
                        delay={0.2}
                    />
                    <ContactCard
                        icon={<Mail className="w-8 h-8" />}
                        title="General Inquiries"
                        description="Other questions or partnership opportunities"
                        email="safedocs45@gmail.com"
                        color="purple"
                        delay={0.3}
                    />
                </div>

                {/* Main Section: Form + Sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact Form - 2 columns */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-2 h-full"
                    >
                        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8 md:p-10 shadow-xl h-full flex flex-col">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">Send us a Message</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-8">Fill out the form and we'll get back to you within 24 hours</p>

                            <form onSubmit={submit} className="space-y-6 flex-1 flex flex-col">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Full Name *
                                        </label>
                                        <input
                                            name="name"
                                            value={form.name}
                                            onChange={change}
                                            placeholder="John Doe"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={change}
                                            placeholder="john@company.com"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Company Name
                                        </label>
                                        <input
                                            name="company"
                                            value={form.company}
                                            onChange={change}
                                            placeholder="Your Company"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Inquiry Type
                                        </label>
                                        <select
                                            name="type"
                                            value={form.type}
                                            onChange={change}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        >
                                            <option value="general">General Question</option>
                                            <option value="sales">Sales & Pricing</option>
                                            <option value="support">Technical Support</option>
                                            <option value="enterprise">Enterprise Inquiry</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Subject
                                    </label>
                                    <input
                                        name="subject"
                                        value={form.subject}
                                        onChange={change}
                                        placeholder="How can we help you?"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    />
                                </div>

                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Message *
                                    </label>
                                    <textarea
                                        rows={5}
                                        name="message"
                                        value={form.message}
                                        onChange={change}
                                        placeholder="Tell us more about your inquiry..."
                                        className="w-full h-full min-h-[120px] px-4 py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                                    />
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400"
                                    >
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-sm font-medium">{error}</span>
                                    </motion.div>
                                )}

                                {sent && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    >
                                        <Check className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-sm font-medium">Thank you! We've received your message and will respond within 24 hours.</span>
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/50 transform hover:scale-[1.02]"
                                >
                                    <Send className="w-5 h-5" />
                                    Send Message
                                </button>
                            </form>
                        </div>
                    </motion.div>

                    {/* Sidebar - 1 column */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="h-full flex flex-col gap-6"
                    >
                        {/* Info Cards */}
                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Response Time</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">We typically respond within 24 hours during business days</p>
                                </div>
                            </div>
                            <div className="h-px bg-slate-200 dark:bg-white/10 my-6"></div>
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                    <Shield className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Privacy First</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Your information is secure and never shared with third parties</p>
                                </div>
                            </div>
                        </div>

                        {/* FAQ */}
                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6 flex-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Answers</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Is my data secure?</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Absolutely. We use zero-retention policy—files are deleted immediately after scanning.</p>
                                </div>
                                <div className="h-px bg-slate-200 dark:bg-white/10"></div>
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Where are you located?</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">We operate globally with a remote-first approach to serve clients worldwide.</p>
                                </div>
                                <div className="h-px bg-slate-200 dark:bg-white/10"></div>
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Do you offer phone support?</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">We primarily use email for support to ensure detailed, quality responses for complex issues.</p>
                                </div>
                                <div className="h-px bg-slate-200 dark:bg-white/10"></div>
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Do you offer educational plans?</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Yes! We provide special pricing for educational institutions. Contact our sales team for details.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}

// Contact Card Component
function ContactCard({ icon, title, description, email, color, delay }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    email: string;
    color: 'blue' | 'emerald' | 'purple';
    delay: number;
}) {
    const colors = {
        blue: {
            bg: 'bg-blue-500/10',
            icon: 'text-blue-500',
            hover: 'hover:border-blue-500/50 dark:hover:border-blue-500/30',
            text: 'text-blue-600 dark:text-blue-400 hover:text-blue-500'
        },
        emerald: {
            bg: 'bg-emerald-500/10',
            icon: 'text-emerald-500',
            hover: 'hover:border-emerald-500/50 dark:hover:border-emerald-500/30',
            text: 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-500'
        },
        purple: {
            bg: 'bg-purple-500/10',
            icon: 'text-purple-500',
            hover: 'hover:border-purple-500/50 dark:hover:border-purple-500/30',
            text: 'text-purple-600 dark:text-purple-400 hover:text-purple-500'
        }
    };

    const theme = colors[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileHover={{ y: -5 }}
            className={`p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] ${theme.hover} transition-all group`}
        >
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${theme.bg} mb-4 group-hover:scale-110 transition-transform`}>
                <div className={theme.icon}>
                    {icon}
                </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">{description}</p>
            <a href={`mailto:${email}`} className={`text-sm font-semibold ${theme.text} transition-colors`}>
                {email}
            </a>
        </motion.div>
    );
}
