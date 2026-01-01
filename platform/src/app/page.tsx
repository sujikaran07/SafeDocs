"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Cpu, Zap, Files } from "lucide-react";

export default function Landing() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("safedocs_token");
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden min-h-[70vh] flex items-center">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            className="h-full w-full object-cover pointer-events-none"
            src="/banneranimation.mp4"
            autoPlay
            muted
            loop
            playsInline
            poster="/bannerBackground.png"
            style={{ filter: "brightness(0.9) contrast(1.05)" }}
          />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-white/30 via-white/60 to-white dark:from-black/20 dark:via-black/55 dark:to-black" />
        <div className="relative z-20 mx-auto max-w-7xl px-4 py-16 md:py-28 text-center">
          <div className="inline-block mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm font-semibold text-blue-600 dark:text-blue-400">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              AI-Powered Security Platform
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight">
            <span className="text-white">Safe</span>
            <span className="text-blue-500">Docs</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl tracking-wide text-slate-700 dark:text-slate-300 max-w-3xl mx-auto font-semibold">
            Enterprise-Grade Document Security Powered by Advanced AI & Machine Learning
          </p>
          <p className="mt-4 text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Detect, analyze, and neutralize malicious threats in documents using LightGBM and MiniLM AI models combined with Content Disarm & Reconstruction (CDR) technology
          </p>

          {!loading && (
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/scan"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/50"
                  >
                    Scan Document
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-bold text-slate-900 dark:text-white bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20 transition-all backdrop-blur-sm border border-white/30"
                  >
                    View Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth?mode=signup"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/50"
                  >
                    Get Started Free
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/auth"
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-bold text-white bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative bg-gradient-to-b from-white via-slate-50 to-white dark:from-black dark:via-slate-950 dark:to-black py-16 md:py-28">
        <div
          className="absolute inset-0 z-0 bg-repeat opacity-5"
          style={{
            backgroundImage: `url(/polygonScatter.png)`,
            backgroundSize: "480px",
            backgroundPosition: "center top",
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4">
          {/* Section Header */}
          <div className="text-center mb-12 md:mb-20">
            <div className="inline-block mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm font-semibold text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-4 h-4" />
                Core Capabilities
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              <span className="text-slate-900 dark:text-white">Advanced </span>
              <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">AI-Powered</span>
              <span className="text-slate-900 dark:text-white"> Security</span>
            </h2>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Military-grade protection driven by cutting-edge machine learning and intelligent threat analysis
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Cpu,
                gradient: "from-blue-500 to-blue-600",
                bgGlow: "bg-blue-500/10",
                borderHover: "group-hover:border-blue-500/50",
                title: "LightGBM AI Engine",
                desc: "Advanced gradient boosting ML model for threat detection"
              },
              {
                icon: Zap,
                gradient: "from-amber-500 to-yellow-500",
                bgGlow: "bg-amber-500/10",
                borderHover: "group-hover:border-amber-500/50",
                title: "MiniLM Embed​dings",
                desc: "Deep learning NLP for semantic content analysis"
              },
              {
                icon: ShieldCheck,
                gradient: "from-emerald-500 to-green-500",
                bgGlow: "bg-emerald-500/10",
                borderHover: "group-hover:border-emerald-500/50",
                title: "CDR Technology",
                desc: "Content Disarm & Reconstruction removes all threats"
              },
              {
                icon: Files,
                gradient: "from-purple-500 to-pink-500",
                bgGlow: "bg-purple-500/10",
                borderHover: "group-hover:border-purple-500/50",
                title: "Multi-Format Support",
                desc: "PDF, DOCX, PPTX, XLSX, RTF with zero retention"
              },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className={`group relative rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-8 hover:shadow-2xl ${feature.borderHover} transition-all duration-300 transform hover:-translate-y-2`}
                >
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 rounded-3xl ${feature.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl`}></div>

                  {/* Content */}
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>


          {/* Pipeline Section */}
          <div className="mt-20 md:mt-32 text-center">
            <div className="inline-block mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm font-semibold text-blue-600 dark:text-blue-400">
                <Zap className="w-4 h-4" />
                Security Pipeline
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              <span className="text-slate-900 dark:text-white">The </span>
              <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Security</span>
              <span className="text-slate-900 dark:text-white"> Pipeline</span>
            </h2>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-10 md:mb-16 leading-relaxed">
              Intelligent four-layer security architecture for comprehensive threat elimination
            </p>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-left relative">
              {/* Connection Lines (hidden on mobile) */}
              <div className="hidden lg:block absolute top-16 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-20"></div>

              {[
                {
                  title: "Document Upload",
                  desc: "Secure multi-format file ingestion with encrypted transmission and validation.",
                  gradient: "from-blue-500 to-blue-600",
                  number: 1
                },
                {
                  title: "AI-Powered Analysis",
                  desc: "Dual ML engine: LightGBM threat classification and MiniLM semantic anomaly detection.",
                  gradient: "from-purple-500 to-purple-600",
                  number: 2
                },
                {
                  title: "CDR Sanitization",
                  desc: "Advanced Content Disarm & Reconstruction neutralizes threats while preserving document integrity.",
                  gradient: "from-amber-500 to-orange-500",
                  number: 3
                },
                {
                  title: "Verified Delivery",
                  desc: "Download sanitized document with comprehensive threat analysis report and compliance certification.",
                  gradient: "from-emerald-500 to-green-500",
                  number: 4
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="group relative rounded-3xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-900/80 dark:to-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 hover:shadow-2xl hover:border-transparent transition-all duration-300 transform hover:-translate-y-2"
                >
                  {/* Gradient Glow on Hover */}
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-2xl`}></div>

                  {/* Content */}
                  <div className="relative">
                    {/* Step Number */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                        <span className="text-2xl font-extrabold text-white">{step.number}</span>
                        {/* Pulse Ring */}
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.gradient} animate-ping opacity-20`}></div>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{step.title}</h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>


          {/* CTA Section */}
          {!isAuthenticated && !loading && (
            <div className="mt-20 md:mt-32">
              <div className="relative rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-blue-500/20 dark:border-blue-500/30 p-8 md:p-16 shadow-xl overflow-hidden">
                {/* Subtle Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0 bg-repeat" style={{ backgroundImage: `url(/polygonScatter.png)`, backgroundSize: "300px" }}></div>
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

                {/* Content */}
                <div className="relative text-center">
                  <div className="inline-block mb-8">
                    <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl opacity-10 blur-2xl"></div>
                      <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <ShieldCheck className="w-12 h-12 text-white" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
                    <span className="text-slate-900 dark:text-white">Deploy </span>
                    <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">AI-Powered</span>
                    <span className="text-slate-900 dark:text-white"> Document Security</span>
                  </h3>
                  <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed">
                    Join enterprises and professionals worldwide leveraging LightGBM and MiniLM AI for military-grade threat protection
                  </p>

                  <Link
                    href="/auth?mode=signup"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full px-10 py-5 text-lg font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/50"
                  >
                    Start Free Trial
                    <ArrowRight className="w-6 h-6" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
