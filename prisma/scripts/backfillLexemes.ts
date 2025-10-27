/* ts-node prisma/scripts/backfillLexemes.ts */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 1) get all distinct (lemma, pos) pairs from Token
  const rows: Array<{ lemma: string; pos: string }> = await prisma.$queryRaw`
    SELECT DISTINCT "lemma", "pos" FROM "Token"
  `;

  let created = 0, skipped = 0;
  for (const { lemma, pos } of rows) {
    const existing = await prisma.lexeme.findUnique({
      where: { lemma_pos: { lemma, pos } },
      select: { id: true },
    });
    if (existing) { skipped++; continue; }

    await prisma.lexeme.create({
      data: {
        lemma,
        pos,
        definition: "",      // minimal placeholder; UI will show "—" or "(no entry yet)"
        cefr: null,
        ipa: null,
        audioUrlUS: null,
        audioUrlUK: null,
        frequency: null,
        forms: {},
        collocations: [],
        etymology: null,
        notes: null,
      },
    });
    created++;
  }
  console.log(`Backfill done. created=${created}, already-present=${skipped}`);
}

main().finally(() => prisma.$disconnect());
