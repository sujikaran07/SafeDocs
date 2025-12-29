import Link from "next/link";
import Image from "next/image";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative bg-slate-100 dark:bg-[#0a0a0a] border-t border-slate-300 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand Section - 40% */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image
                src="/safedocs-icon.png"
                alt="SafeDocs"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <h3 className="text-lg font-bold">
                <span className="text-slate-900 dark:text-white">Safe</span>
                <span className="text-blue-500">Docs</span>
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              AI-powered document security platform protecting your files with intelligent threat detection and advanced malware analysis.
            </p>

            {/* Trust Badge */}
            <div className="flex items-center gap-2 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Secure & Encrypted</span>
              </div>
            </div>
          </div>

          {/* Product - 20% */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Product</h3>
            <ul className="space-y-2.5">
              {[
                { name: "Scan Document", href: "/scan" },
                { name: "Dashboard", href: "/dashboard" },
                { name: "Pricing", href: "/upgrade" },
                { name: "Features", href: "/" },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company - 20% */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Company</h3>
            <ul className="space-y-2.5">
              {[
                { name: "About", href: "/about" },
                { name: "Contact", href: "/contact" },
                { name: "FAQ", href: "/faq" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Follow Us - 20% */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Follow Us</h3>
            <ul className="space-y-2.5">
              {/* LinkedIn */}
              <li>
                <a
                  href="https://www.linkedin.com/company/safedocs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </a>
              </li>

              {/* Instagram */}
              <li>
                <a
                  href="https://instagram.com/safedocs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                  Instagram
                </a>
              </li>

              {/* Facebook */}
              <li>
                <a
                  href="https://facebook.com/safedocs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                  Facebook
                </a>
              </li>

              {/* Twitter */}
              <li>
                <a
                  href="https://twitter.com/safedocs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-300 dark:border-slate-800 bg-slate-200 dark:bg-black/50">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              © {new Date().getFullYear()} SafeDocs. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link
                href="/privacy"
                className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
