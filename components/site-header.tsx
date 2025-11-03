"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function NavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`rounded px-2 py-1 text-sm transition-colors ${
        active
          ? "bg-zinc-900 text-white"
          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      {children}
    </Link>
  );
}

function GlobalSearch({ className }: { className?: string }) {
  const sp = useSearchParams();
  const defaultValue = sp.get("q") ?? "";
  // Simple GET form to "/"
  return (
    <form action="/" className={className}>
      <div className="flex items-center gap-2">
        <Input
          name="q"
          defaultValue={defaultValue}
          placeholder="Search poems…"
          aria-label="Search poems"
          className="w-full"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </div>
    </form>
  );
}

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-xs font-bold text-white">
              AL
            </span>
            <span className="hidden text-sm font-semibold sm:inline">
              Anna Livebardon — Poem Explorer
            </span>
            <span className="text-sm font-semibold sm:hidden">Poem Explorer</span>
          </Link>
        </div>

        {/* Center: Global Search (hidden on xs) */}
        <div className="hidden flex-1 px-4 md:block">
          <Suspense fallback={null}>
            <GlobalSearch />
          </Suspense>
        </div>

        {/* Right: Nav + Mobile menu button */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/">Catalogue</NavLink>
          {/* <NavLink href="/api/poems">API</NavLink> */}
        </nav>

        <div className="md:hidden">
          <Button
            variant="outline"
            size="sm"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            Menu
          </Button>
          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Menu</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Suspense fallback={null}>
                  <GlobalSearch />
                </Suspense>
                <div className="flex flex-col gap-2">
                  <NavLink href="/" onClick={() => setMenuOpen(false)}>
                    Catalogue
                  </NavLink>
                  <NavLink href="/poem/rain-song" onClick={() => setMenuOpen(false)}>
                    Sample
                  </NavLink>
                  <NavLink href="/api/poems" onClick={() => setMenuOpen(false)}>
                    API
                  </NavLink>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
