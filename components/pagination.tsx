"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function setParam(sp: URLSearchParams, key: string, value?: string | null) {
  const clone = new URLSearchParams(sp.toString());
  if (value === undefined || value === null || value === "") clone.delete(key);
  else clone.set(key, String(value));
  return clone;
}

export default function Pagination({
  totalPages,
  siblingCount = 1,
}: {
  totalPages: number;
  siblingCount?: number;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const currentPage = Math.max(1, parseInt(sp.get("page") || "1", 10));

  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  const start = Math.max(1, currentPage - siblingCount);
  const end = Math.min(totalPages, currentPage + siblingCount);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("…");
  }
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push("…");
    pages.push(totalPages);
  }

  const prev = Math.max(1, currentPage - 1);
  const next = Math.min(totalPages, currentPage + 1);

  return (
    <nav className="flex items-center justify-center gap-2 mt-6" aria-label="Pagination">
      <Link
        className="rounded border px-3 py-1 text-sm hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50"
        href={`${pathname}?${setParam(sp, "page", String(prev)).toString()}`}
        aria-disabled={currentPage === 1}
      >
        Prev
      </Link>

      {pages.map((p, i) =>
        typeof p === "number" ? (
          <Link
            key={`${p}-${i}`}
            href={`${pathname}?${setParam(sp, "page", String(p)).toString()}`}
            aria-current={p === currentPage ? "page" : undefined}
            className={`rounded border px-3 py-1 text-sm hover:bg-zinc-50 ${
              p === currentPage ? "bg-zinc-900 text-white hover:bg-zinc-900" : ""
            }`}
          >
            {p}
          </Link>
        ) : (
          <span key={`e-${i}`} className="px-1 text-zinc-500">
            {p}
          </span>
        )
      )}

      <Link
        className="rounded border px-3 py-1 text-sm hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50"
        href={`${pathname}?${setParam(sp, "page", String(next)).toString()}`}
        aria-disabled={currentPage === totalPages}
      >
        Next
      </Link>
    </nav>
  );
}
