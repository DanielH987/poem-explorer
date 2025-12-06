// app/api/lexeme/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { lexemeToLexemeCard, type LexemeWithRelations } from "@/lib/lexeme-card";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lemma = searchParams.get("lemma");
  const pos = searchParams.get("pos");

  if (!lemma || !pos) {
    return NextResponse.json(
      { error: "Missing lemma or pos query parameter" },
      { status: 400 }
    );
  }

  const lexeme = await prisma.lexeme.findUnique({
    where: {
      // @@unique([lemma, pos]) in your schema
      lemma_pos: { lemma, pos },
    },
    include: {
      senses: true,
      translations: true,
      tokens: {
        take: 1,
      },
    },
  });

  if (!lexeme) {
    // return a minimal card so the UI still works
    return NextResponse.json({
      lemma,
      pos,
      definition: "",
    });
  }

  const card = lexemeToLexemeCard(lexeme as LexemeWithRelations);

  return NextResponse.json(card);
}
