import Link from "next/link";
import { prisma } from "@/lib/db";

async function getPoems(q?: string) {
  if (!q) {
    return prisma.poem.findMany({
      select: { slug: true, title: true, year: true, category: true },
      orderBy: { title: "asc" },
    });
  }
  return prisma.poem.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { slug: true, title: true, year: true, category: true },
    orderBy: { title: "asc" },
  });
}

export default async function Catalogue({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const poems = await getPoems(searchParams.q);
  return (
    <div className="space-y-6">
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search poems…"
          className="border px-3 py-2 rounded w-full"
        />
        <button className="border rounded px-3">Search</button>
      </form>

      <ul className="grid md:grid-cols-2 gap-4">
        {poems.map((p) => (
          <li key={p.slug} className="border rounded p-4">
            <h3 className="font-semibold">{p.title}</h3>
            <p className="text-sm text-zinc-600">
              {p.category || ""} {p.year ? `• ${p.year}` : ""}
            </p>
            <Link href={`/poem/${p.slug}`} className="mt-2 inline-block underline">
              Open
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
