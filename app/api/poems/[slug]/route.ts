import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const poem = await prisma.poem.findUnique({ where: { slug: params.slug } });
  if (!poem) return new NextResponse("Not found", { status: 404 });
  const lines = await prisma.line.findMany({
    where: { poemId: poem.id },
    orderBy: { index: "asc" },
  });
  const tokens = await prisma.token.findMany({ where: { poemId: poem.id } });
  return NextResponse.json({ poem, lines, tokens });
}
