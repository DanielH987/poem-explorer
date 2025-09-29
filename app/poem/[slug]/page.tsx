import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PoemViewer from "@/components/poem-viewer";
import Breadcrumbs from "@/components/breadcrumbs";

export default async function PoemPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { w?: string; pos?: string; token?: string };
}) {
  const poem = await prisma.poem.findUnique({
    where: { slug: params.slug },
    select: { id: true, slug: true, title: true },
  });
  if (!poem) return notFound();

  const tokens = await prisma.token.findMany({
    where: { poemId: poem.id },
    select: {
      id: true,
      lineId: true,
      start: true,
      end: true,
      surface: true,
      lemma: true,
      pos: true,
    },
  });
  const lines = await prisma.line.findMany({
    where: { poemId: poem.id },
    orderBy: { index: "asc" },
    select: { id: true, index: true, text: true },
  });

  return (
    <div className="space-y-4">
      <Breadcrumbs poemTitle={poem.title} />
      <h1 className="text-2xl font-bold">{poem.title}</h1>
      <PoemViewer
        poem={{ id: poem.id, slug: poem.slug, title: poem.title }}
        lines={lines}
        tokens={tokens}
        deepLink={searchParams}
      />
    </div>
  );
}
