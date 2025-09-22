import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBasicAuth } from "@/lib/admin-auth";

export async function POST(req: Request) {
  if (!requireBasicAuth(req))
    return new NextResponse("Unauthorized", { status: 401 });
  const { searchParams } = new URL(req.url);
  const poemId = searchParams.get("poemId");
  if (!poemId) return new NextResponse("Missing poemId", { status: 400 });

  // TODO: enqueue NLP job; placeholder log
  await prisma.auditLog.create({
    data: { actor: "admin", action: "REANNOTATE", entity: `Poem:${poemId}`, meta: {} },
  });
  return NextResponse.json({ ok: true });
}
