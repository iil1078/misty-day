import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { StorageErrorBanner } from "@/components/StorageErrorBanner";

export const metadata: Metadata = {
  title: "Spendwise — Expense Tracker",
  description: "Track, filter, and analyze your personal expenses.",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <Providers>
          <Header />
          <StorageErrorBanner />
          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
