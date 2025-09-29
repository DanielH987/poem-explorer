import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/providers";
import SiteHeader from "@/components/site-header";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_NAME || "Poem Explorer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-zinc-900">
        <Providers>
          <Suspense fallback={null}>
            <SiteHeader />
          </Suspense>
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
