import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBasicAuth } from "@/lib/admin-auth";
import { JSDOM } from "jsdom";
import { tokenizeLine } from "@/lib/tokenize";

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

  // Prefer explicit <p> blocks (TXT importer emits one <p> per line)
  const ps = Array.from(doc.querySelectorAll("p"));
  let rawLines: string[] = [];

  if (ps.length > 0) {
    rawLines = ps.map((p) => {
      const innerHtml = p.innerHTML
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/&nbsp;/gi, " ");
      const tmpDom = new JSDOM(`<body>${innerHtml}</body>`);
      const text = tmpDom.window.document.body.textContent ?? "";
      return text
        .replace(/\r/g, "")
        .replace(/\u00A0/g, " ")
        .replace(/[ \t]+$/g, ""); // trim right, keep internal spacing
    });
    // keep empty lines (stanza breaks)
  } else {
    // Fallback if no <p>: best-effort split on <br>
    const fallback = (doc.body?.innerHTML || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/&nbsp;/gi, " ");
    rawLines = fallback
      .split(/\n/)
      .map((l) =>
        l.replace(/\r/g, "").replace(/\u00A0/g, " ").replace(/[ \t]+$/g, ""),
      );
  }

  // Upsert poem record
  const poem = await prisma.poem.upsert({
    where: { slug },
    update: { title, sourceUrl, year, category, html },
    create: { slug, title, sourceUrl, year, category, html },
  });

  // Replace lines exactly as parsed (including empty ones)
  await prisma.line.deleteMany({ where: { poemId: poem.id } });
  const lines = await prisma.$transaction(
    rawLines.map((l, i) =>
      prisma.line.create({ data: { poemId: poem.id, index: i, text: l } }),
    ),
  );

  // Tokenize with Unicode-aware regex
  await prisma.token.deleteMany({ where: { poemId: poem.id } });
  for (const line of lines) {
    if (!line.text || line.text.trim().length === 0) continue;
    const spans = tokenizeLine(line.text);
    for (const { start, end, surface } of spans) {
      await prisma.token.create({
        data: {
          poemId: poem.id,
          lineId: line.id,
          start,
          end,
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
