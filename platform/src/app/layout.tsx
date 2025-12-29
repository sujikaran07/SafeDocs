import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ThemeProvider from "@/components/ThemeProvider";
import AuthProvider from "@/components/AuthProvider";
import JsonLd from "@/components/JsonLd";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://safedocs.com';

export const metadata = {
  title: {
    default: "SafeDocs | AI-Powered Document Security & CDR",
    template: "%s | SafeDocs"
  },
  description: "Protect your enterprise with SafeDocs. AI-powered document scanning using LightGBM and MiniLM with Content Disarm & Reconstruction (CDR) to neutralize malicious files.",
  keywords: ["document security", "CDR", "content disarm and reconstruction", "malware analysis", "secure file sharing", "AI threat detection", "SafeDocs", "LightGBM", "cybersecurity"],
  authors: [{ name: "SafeDocs Security Team" }],
  creator: "SafeDocs",
  publisher: "SafeDocs",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(appUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "SafeDocs | AI-Powered Document Security & CDR",
    description: "Neutralize malicious documents with enterprise-grade AI threat detection and CDR technology.",
    url: appUrl,
    siteName: "SafeDocs",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SafeDocs Platform Overview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "SafeDocs | AI-Powered Document Security & CDR",
    description: "Neutralize malicious documents with enterprise-grade AI threat detection and CDR technology.",
    creator: "@safedocs",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'cybersecurity',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <JsonLd />
      </head>
      <body className="bg-white dark:bg-black text-slate-900 dark:text-white antialiased selection:bg-blue-500/30">
        <AuthProvider>
          <ThemeProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow">
                {children}
              </main>
              <Footer />
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
