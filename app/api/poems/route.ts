import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { category: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const poems = await prisma.poem.findMany({
    where,
    select: { slug: true, title: true, year: true, category: true },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({ poems });
}
