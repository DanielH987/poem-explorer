"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Breadcrumbs({
  poemTitle,
}: {
  poemTitle?: string;
}) {
  const pathname = usePathname();
  const isPoem = pathname.startsWith("/poem/");

  if (!isPoem && !poemTitle) return null;

  return (
    <div className="mt-3 text-sm text-zinc-600">
      <Link href="/" className="underline-offset-4 hover:underline">
        Catalogue
      </Link>
      {poemTitle ? (
        <>
          <span className="px-2">/</span>
          <span className="text-zinc-900">{poemTitle}</span>
        </>
      ) : null}
    </div>
  );
}
