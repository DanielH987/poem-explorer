import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/providers";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_NAME || "Poem Explorer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-zinc-900">
        <Providers>
          <main className="mx-auto max-w-4xl p-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
