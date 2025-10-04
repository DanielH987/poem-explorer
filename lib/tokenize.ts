// lib/tokenize.ts

// Hyphens we want to treat as “in-word” joiners:
//  - ASCII hyphen-minus U+002D
//  - Hyphen U+2010
//  - Non-breaking hyphen U+2011
const HYPHENS = "[\\-\\u2010\\u2011]";

// Unicode-aware tokenizer for French (and others):
// - keeps accents/ligatures via \p{L}\p{M}
// - keeps inner apostrophes (' ’) when followed by a letter
// - keeps hyphenated words using HYPHENS above
// - allows digits inside words via \p{N}
export const WORD_RE = new RegExp(
  `\\p{L}(?:[\\p{L}\\p{M}\\p{N}]|['’](?=\\p{L})|${HYPHENS}(?=\\p{L}))*`,
  "gu"
);

export type TokenSpan = { start: number; end: number; surface: string };

export function tokenizeLine(text: string): TokenSpan[] {
  const out: TokenSpan[] = [];
  if (!text) return out;
  let m: RegExpExecArray | null;
  while ((m = WORD_RE.exec(text))) {
    out.push({ start: m.index, end: m.index + m[0].length, surface: m[0] });
  }
  return out;
}
