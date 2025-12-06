/**
 * scripts/backfill-lexemes.ts
 *
 * Populates Lexeme data using OpenAI.
 * Fills: definition, frequency, notes, collocations, forms, example, EN translation.
 * Leaves IPA/CEFR/audio untouched.
 *
 * Run with:
 *   npm run generate:lexemes
 */

import OpenAI from "openai";
import { prisma } from "@/lib/db";
import type { Lexeme, Prisma } from "@prisma/client";

// ----------------------------------------
// 1. Types
// ----------------------------------------

export type LexemeEnrichment = {
  definition: string;
  example: { text: string };
  collocations: string[];
  forms: Record<string, string>;
  notes?: string;
  english_translation: string;
  frequency?: "very common" | "common" | "uncommon" | "rare" | "unknown";
};

// ----------------------------------------
// 2. OpenAI client
// ----------------------------------------

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ----------------------------------------
// 3. Enrichment
// ----------------------------------------

async function enrichLexemeWithOpenAI(lexeme: Lexeme): Promise<LexemeEnrichment> {
  const system = `
You are a careful bilingual lexicographer for French → English.
Return ONLY JSON. No IPA, CEFR, or audio URLs.
`;

  const user = `
Provide dictionary-style JSON data for:

- Lemma: "${lexeme.lemma}"
- Part of speech: "${lexeme.pos}"

JSON shape:
{
  "definition": "…",
  "example": { "text": "…" },
  "collocations": ["…"],
  "forms": { "label": "form" },
  "notes": "…",
  "english_translation": "…",
  "frequency": "common"
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 400,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Empty OpenAI response");

  return JSON.parse(content) as LexemeEnrichment;
}

// ----------------------------------------
// 4. Save enrichment → DB
// ----------------------------------------

async function saveEnrichment(lexeme: Lexeme, data: LexemeEnrichment) {
  await prisma.lexeme.update({
    where: { id: lexeme.id },
    data: {
      definition:
        !lexeme.definition || lexeme.definition.trim() === ""
          ? data.definition
          : lexeme.definition,

      frequency: data.frequency ?? lexeme.frequency,

      notes:
        !lexeme.notes || lexeme.notes.trim() === ""
          ? data.notes ?? lexeme.notes
          : lexeme.notes,

      forms:
        data.forms && Object.keys(data.forms).length > 0
          ? data.forms
          : lexeme.forms,

      collocations:
        data.collocations && data.collocations.length > 0
          ? data.collocations
          : lexeme.collocations,
    },
  });

  // Example sentence (Sense)
  if (data.example?.text) {
    const existing = await prisma.sense.findFirst({
      where: { lexemeId: lexeme.id },
    });

    if (existing) {
      await prisma.sense.update({
        where: { id: existing.id },
        data: {
          def: existing.def || data.definition,
          examples: [{ text: data.example.text }],
        },
      });
    } else {
      await prisma.sense.create({
        data: {
          lexemeId: lexeme.id,
          def: data.definition,
          examples: [{ text: data.example.text }],
        },
      });
    }
  }

  // English translation
  await prisma.translation.upsert({
    where: {
      lexemeId_lang: { lexemeId: lexeme.id, lang: "en" },
    },
    create: {
      lexemeId: lexeme.id,
      lang: "en",
      text: data.english_translation,
    },
    update: { text: data.english_translation },
  });
}

// ----------------------------------------
// 5. Batch fetch
// ----------------------------------------

const BATCH_SIZE = 20;

async function getLexemeBatch() {
  return prisma.lexeme.findMany({
    where: {
      OR: [
        { definition: "" },
        { translations: { none: { lang: "en" } } },
      ],
    },
    take: BATCH_SIZE,
  });
}

// ----------------------------------------
// 6. Main script
// ----------------------------------------

async function main() {
  while (true) {
    const batch = await getLexemeBatch();

    if (batch.length === 0) {
      console.log("\n🎉 All lexemes enriched. Done.");
      break;
    }

    console.log(`\nEnriching ${batch.length} lexemes…\n`);

    for (const lexeme of batch) {
      console.log(`→ ${lexeme.lemma} (${lexeme.pos})`);

      try {
        const enriched = await enrichLexemeWithOpenAI(lexeme);
        await saveEnrichment(lexeme, enriched);

        await new Promise((r) => setTimeout(r, 150)); // gentle rate limit

      } catch (err: any) {
        const code = err?.code;

        if (code === "P1001" || code === "P1017") {
          console.error(
            `\n❌ Lost DB connection (${code}).\n` +
              `Restart script with: npm run generate:lexemes\n`
          );
          await prisma.$disconnect();
          return;
        }

        console.error(`❌ Error enriching ${lexeme.lemma}:\n`, err);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
