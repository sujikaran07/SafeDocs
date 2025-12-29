import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pricing Plans",
    description: "Choose the right plan for your document security needs. Free, Pro, and Enterprise options available with AI scanning and CDR technology.",
    keywords: ["SafeDocs pricing", "document security plans", "CDR subscription", "malware analysis pricing"],
    openGraph: {
        title: "SafeDocs Pricing | Secure Your Documents",
        description: "Flexible plans for individuals and enterprises. Start for free or unlock advanced AI threat detection.",
    }
};

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
