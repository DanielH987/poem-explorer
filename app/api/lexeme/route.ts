import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lemma = searchParams.get("lemma");
  const pos = searchParams.get("pos");
  if (!lemma || !pos) return new NextResponse("Missing", { status: 400 });

  const lex = await prisma.lexeme.findUnique({
    where: { lemma_pos: { lemma, pos } },
  });

  if (!lex) {
    return NextResponse.json(
      { lemma, pos, definition: "(no entry yet)", collocations: [] },
      {
        headers: {
          "Cache-Control": "s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  }

  const sense = await prisma.sense.findFirst({ where: { lexemeId: lex.id } });
  let example: { text: string } | undefined;
  if (sense?.examples) {
    try {
      const arr = sense.examples as unknown as string;
      const parsed = typeof sense.examples === "string" ? JSON.parse(arr) : (sense.examples as any);
      if (Array.isArray(parsed) && parsed[0]?.text) example = { text: parsed[0].text };
    } catch {}
  }

  return NextResponse.json(
    {
      lemma: lex.lemma,
      pos: lex.pos,
      cefr: lex.cefr || undefined,
      ipa: lex.ipa || undefined,
      audio: { us: lex.audioUrlUS || undefined, uk: lex.audioUrlUK || undefined },
      definition: lex.definition || sense?.def || "",
      example,
      morphology: undefined,
      forms: lex.forms || undefined,
      transitivity: undefined,
      collocations: (lex.collocations as unknown as string[]) || [],
      frequency: lex.frequency || undefined,
      etymology: lex.etymology || undefined,
      translations: undefined,
      notes: lex.notes || undefined,
    },
    {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
