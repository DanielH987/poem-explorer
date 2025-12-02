"use client";

import { usePathname, useSearchParams } from "next/navigation";

export default function CategoryFilter({
  categories,
}: {
  categories: string[];
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const selected = sp.get("category") || "";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const next = new URLSearchParams(sp.toString());
    if (v) next.set("category", v);
    else next.delete("category");
    next.delete("page"); // reset pagination
    window.location.assign(`${pathname}?${next.toString()}`);
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-zinc-600">Catégorie</span>
      <select
        className="rounded border bg-white px-2 py-1"
        value={selected}
        onChange={onChange}
      >
        <option value="">Toutes</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
