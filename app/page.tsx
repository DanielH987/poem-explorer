import Link from "next/link";
import { prisma } from "@/lib/db";
import Pagination from "@/components/pagination";
import AzFilter from "@/components/az-filter";
import CategoryFilter from "@/components/category-filter";

const PAGE_SIZE = 24;

type Search = {
  q?: string;
  page?: string;
  category?: string;
  letter?: string;
};

function buildWhere({ q, category, letter }: Search) {
  const where: any = {};
  const AND: any[] = [];

  if (q && q.trim()) {
    AND.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (category && category.trim()) {
    AND.push({ category: { equals: category } });
  }
  if (letter && /^[A-Za-z]$/.test(letter)) {
    AND.push({ title: { startsWith: letter, mode: "insensitive" } });
  }

  if (AND.length) where.AND = AND;
  return where;
}

async function getCategories(): Promise<string[]> {
  // Distinct categories from DB (ignores nulls)
  const rows = await prisma.poem.findMany({
    where: { category: { not: null } },
    distinct: ["category"],
    select: { category: true },
  });
  return rows
    .map((r) => r.category!)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export default async function Catalogue({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const where = buildWhere(params);

  const [total, poems, categories] = await Promise.all([
    prisma.poem.count({ where }),
    prisma.poem.findMany({
      where,
      orderBy: [{ title: "asc" }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: { slug: true, title: true, year: true, category: true },
    }),
    getCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Filters row */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-zinc-600">
          {params.q ? (
            <>
              Results for <span className="font-medium">“{params.q}”</span>
            </>
          ) : (
            <>All poems</>
          )}
          {total > 0 && (
            <>
              {" "}
              · <span className="font-medium">{total}</span>{" "}
              {total === 1 ? "result" : "results"}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CategoryFilter categories={categories} />
        </div>
      </section>

      {/* A–Z bar */}
      <section className="rounded border p-2">
        <AzFilter />
      </section>

      {/* Cards grid */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {poems.map((p) => (
          <li
            key={p.slug}
            className="group rounded border bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <Link href={`/poem/${p.slug}`} className="block h-full">
              <h3 className="line-clamp-2 min-h-[3rem] text-base font-semibold group-hover:underline">
                {p.title}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-sm text-zinc-600">
                {p.category && (
                  <span className="rounded bg-zinc-100 px-2 py-0.5">
                    {p.category}
                  </span>
                )}
                {p.year ? <span>• {p.year}</span> : null}
              </div>
              <span className="mt-3 inline-block text-sm underline underline-offset-4">
                Read
              </span>
            </Link>
          </li>
        ))}
        {/* Empty state */}
        {poems.length === 0 && (
          <li className="col-span-full rounded border p-6 text-center text-zinc-600">
            No poems match the current filters.
          </li>
        )}
      </ul>

      {/* Pagination */}
      <Pagination totalPages={totalPages} />
    </div>
  );
}
