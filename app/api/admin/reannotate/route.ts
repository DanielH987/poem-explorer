// app/api/admin/reannotate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBasicAuth } from "@/lib/admin-auth";
import { tokenizeLine } from "@/lib/tokenize";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!requireBasicAuth(req))
    return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const poemId = url.searchParams.get("poemId");
  if (!poemId) return new NextResponse("Missing poemId", { status: 400 });

  const poem = await prisma.poem.findUnique({ where: { id: poemId } });
  if (!poem) return new NextResponse("Not found", { status: 404 });

  const lines = await prisma.line.findMany({
    where: { poemId },
    orderBy: { index: "asc" },
  });

  await prisma.token.deleteMany({ where: { poemId } });
  for (const line of lines) {
    if (!line.text || line.text.trim().length === 0) continue;
    const spans = tokenizeLine(line.text);
    for (const { start, end, surface } of spans) {
      await prisma.token.create({
        data: {
          poemId,
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
    data: { actor: "admin", action: "REANNOTATE", entity: `Poem:${poem.slug}`, meta: {} },
  });

  return NextResponse.json({ ok: true, poemId });
}
