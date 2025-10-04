// lib/tokenize.ts
// Unicode-aware tokenizer for French (and other languages):
// - keeps accents & ligatures (œ)       via \p{L}\p{M}
// - keeps inner apostrophes (l’amour)   via ['’](?=\p{L})
// - keeps hyphenated words              via [‐--](?=\p{L})  (ASCII -, U+2010, U+2011)
// - includes digits inside words        via \p{N}

export const WORD_RE =
  /\p{L}(?:[\p{L}\p{M}\p{N}]|['’](?=\p{L})|[‐--](?=\p{L}))*/gu;

export type TokenSpan = { start: number; end: number; surface: string };

export function tokenizeLine(text: string): TokenSpan[] {
  const out: TokenSpan[] = [];
  if (!text) return out;
  let m: RegExpExecArray | null;
  while ((m = WORD_RE.exec(text))) {
    const surface = m[0];
    out.push({ start: m.index, end: m.index + surface.length, surface });
  }
  return out;
}
