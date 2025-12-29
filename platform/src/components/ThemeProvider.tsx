"use client";

import { ThemeProvider as ThemeContextProvider } from "@/contexts/ThemeContext";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    return <ThemeContextProvider>{children}</ThemeContextProvider>;
}
