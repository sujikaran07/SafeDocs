import { Metadata } from "next";

export const metadata: Metadata = {
    title: "About Us",
    description: "Learn about SafeDocs and our mission to provide military-grade document security using advanced AI and CDR technology.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
