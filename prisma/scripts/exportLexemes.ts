import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const esc = (s: string) =>
  /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

async function main() {
  // ✅ Always write to a known folder in your project
  const outDir = path.join(process.cwd(), "exports");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const lexPath = path.join(outDir, "lexemes.csv");
  const trPath = path.join(outDir, "lexeme_translations.csv");

  const rows = await prisma.lexeme.findMany({
    select: {
      id: true, lemma: true, pos: true, definition: true, ipa: true,
      audioUrlUS: true, audioUrlUK: true, cefr: true, frequency: true,
      etymology: true, notes: true, forms: true, collocations: true,
      translations: { select: { lang: true, text: true } },
    },
    orderBy: [{ lemma: "asc" }, { pos: "asc" }],
  });

  const head = [
    "id","lemma","pos","definition","ipa","audioUrlUS","audioUrlUK",
    "cefr","frequency","etymology","notes","forms_json","collocations_json"
  ];
  const lines = [head.join(",")];

  for (const r of rows) {
    const vals = [
      r.id, r.lemma, r.pos, r.definition ?? "", r.ipa ?? "",
      r.audioUrlUS ?? "", r.audioUrlUK ?? "", r.cefr ?? "",
      r.frequency ?? "", r.etymology ?? "", r.notes ?? "",
      r.forms ? JSON.stringify(r.forms) : "",
      r.collocations ? JSON.stringify(r.collocations) : ""
    ].map(x => esc(String(x)));
    lines.push(vals.join(","));
  }
  fs.writeFileSync(lexPath, lines.join("\n"), "utf8");

  const trHead = ["lemma","pos","lang","text"];
  const trLines = [trHead.join(",")];
  for (const r of rows) {
    for (const t of r.translations) {
      trLines.push([r.lemma, r.pos, t.lang, t.text].map(x => esc(String(x))).join(","));
    }
  }
  fs.writeFileSync(trPath, trLines.join("\n"), "utf8");

  console.log("✅ Exported successfully!");
  console.log("  Lexemes:", lexPath);
  console.log("  Translations:", trPath);
}

main().finally(() => prisma.$disconnect());
