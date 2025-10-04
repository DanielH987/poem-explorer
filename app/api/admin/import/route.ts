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

  // --- Preserve paragraph boundaries and stanza breaks ---
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Prefer explicit <p> blocks (the TXT importer sends one <p> per source line)
  const ps = Array.from(doc.querySelectorAll("p"));

  let rawLines: string[] = [];

  if (ps.length > 0) {
    rawLines = ps.map((p) => {
      // Inside a paragraph, <br> is a *line break*; keep it
      const innerHtml = p.innerHTML
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/&nbsp;/gi, " ");

      // Strip any remaining tags *inside* the paragraph safely
      const tmpDom = new JSDOM(`<body>${innerHtml}</body>`);
      const text = tmpDom.window.document.body.textContent ?? "";

      // Keep the line as-is except trailing spaces; do NOT collapse internal spaces
      return text.replace(/\r/g, "").replace(/\u00A0/g, " ").replace(/[ \t]+$/g, "");
    });
    // DO NOT filter empties — empty <p> becomes an empty string => stanza break
  } else {
    // Fallback: best-effort from body HTML if no <p> present
    const fallback = (doc.body?.innerHTML || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/&nbsp;/gi, " ");
    rawLines = fallback
      .split(/\n/)
      .map((l) => l.replace(/\r/g, "").replace(/\u00A0/g, " ").replace(/[ \t]+$/g, ""));
    // Still keep empties
  }

  // --- Upsert poem ---
  const poem = await prisma.poem.upsert({
    where: { slug },
    update: { title, sourceUrl, year, category, html },
    create: { slug, title, sourceUrl, year, category, html },
  });

  // Replace lines exactly in the same order; keep empty stanza separators
  await prisma.line.deleteMany({ where: { poemId: poem.id } });

  const lines = await prisma.$transaction(
    rawLines.map((l, i) =>
      prisma.line.create({
        data: { poemId: poem.id, index: i, text: l },
      }),
    ),
  );

  // Naive tokenization for UI (skip empty lines)
  await prisma.token.deleteMany({ where: { poemId: poem.id } });
  for (const line of lines) {
    if (!line.text || line.text.trim().length === 0) continue;
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
