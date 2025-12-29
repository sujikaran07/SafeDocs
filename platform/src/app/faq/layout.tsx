import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Frequently Asked Questions",
    description: "Find answers to common questions about document security, CDR technology, and how SafeDocs protects your data.",
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
