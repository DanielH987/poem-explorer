import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBasicAuth } from "@/lib/admin-auth";
import { JSDOM } from "jsdom";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!requireBasicAuth(req))
    return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    html,
    title,
    slug,
    sourceUrl,
    year,
    category,
  }: {
    html?: string;
    title: string;
    slug: string;
    sourceUrl?: string;
    year?: number;
    category?: string;
  } = body;

  if (!html || !title || !slug)
    return new NextResponse("Missing fields", { status: 400 });

  const dom = new JSDOM(html);
  const text = dom.window.document.body.textContent || "";
  const rawLines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const poem = await prisma.poem.upsert({
    where: { slug },
    update: { title, sourceUrl, year, category, html },
    create: { slug, title, sourceUrl, year, category, html },
  });

  await prisma.line.deleteMany({ where: { poemId: poem.id } });
  const lines = await prisma.$transaction(
    rawLines.map((l, i) =>
      prisma.line.create({ data: { poemId: poem.id, index: i, text: l } }),
    ),
  );

  // naive tokenization so UI works before NLP
  await prisma.token.deleteMany({ where: { poemId: poem.id } });
  for (const line of lines) {
    const re = /\b[\w'’-]+\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line.text))) {
      const surface = m[0];
      await prisma.token.create({
        data: {
          poemId: poem.id,
          lineId: line.id,
          start: m.index,
          end: m.index + surface.length,
          surface,
          lemma: surface.toLowerCase(),
          pos: "X",
          feats: {},
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: { actor: "admin", action: "IMPORT", entity: `Poem:${slug}`, meta: {} },
  });

  return NextResponse.json({ ok: true, poemId: poem.id });
}
