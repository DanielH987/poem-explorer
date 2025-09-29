"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function setParam(sp: URLSearchParams, key: string, value?: string | null) {
  const clone = new URLSearchParams(sp.toString());
  if (!value) clone.delete(key);
  else clone.set(key, value);
  // reset page when changing filter
  clone.delete("page");
  return clone;
}

export default function AzFilter() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const active = (sp.get("letter") || "").toUpperCase();

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Link
        href={`${pathname}?${setParam(sp, "letter", "").toString()}`}
        className={`rounded px-2 py-1 text-sm ${!active ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}
      >
        All
      </Link>
      {letters.map((L) => (
        <Link
          key={L}
          href={`${pathname}?${setParam(sp, "letter", L).toString()}`}
          className={`rounded px-2 py-1 text-sm ${
            active === L ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"
          }`}
        >
          {L}
        </Link>
      ))}
    </div>
  );
}
