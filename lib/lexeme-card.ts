// lib/lexeme-card.ts
import type { Lexeme, Sense, Translation, Token } from "@prisma/client";

export type LexemeCard = {
    lemma: string;
    pos: string;
    cefr?: string;
    ipa?: string;
    audio?: { us?: string; uk?: string };
    definition: string;
    example?: { text: string };
    morphology?: {
        surface: string;
        lemma: string;
        pos: string;
        features: Record<string, string>;
    };
    forms?: Record<string, string>;
    transitivity?: string;
    collocations?: string[];
    frequency?: string;
    etymology?: string;
    translations?: Record<string, string>;
    notes?: string;
};

// NOTE: now includes tokens
export type LexemeWithRelations = Lexeme & {
    senses: Sense[];
    translations: Translation[];
    tokens: Token[];
};

export function lexemeToLexemeCard(
    lexeme: LexemeWithRelations,
    opts?: { token?: Token | null }
): LexemeCard {
    const primarySense = lexeme.senses[0] ?? null;

    // -------- Examples --------
    type ExampleEntry = { text: string };
    let exampleText: string | undefined;

    if (primarySense?.examples) {
        const raw = primarySense.examples as unknown;

        let examples: ExampleEntry[] | undefined;

        if (Array.isArray(raw)) {
            examples = raw as ExampleEntry[];
        } else if (typeof raw === "string") {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    examples = parsed;
                }
            } catch {
                // ignore bad JSON
            }
        }

        if (examples?.length && examples[0]?.text) {
            exampleText = examples[0].text;
        }
    }

    // -------- Forms (Json?) --------
    let forms: Record<string, string> | undefined;
    if (lexeme.forms) {
        const raw = lexeme.forms as unknown;

        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
            forms = raw as Record<string, string>;
        } else if (typeof raw === "string") {
            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                    forms = parsed as Record<string, string>;
                }
            } catch {
                // ignore
            }
        }
    }

    // -------- Collocations (Json? string[]) --------
    let collocations: string[] | undefined;
    if (lexeme.collocations) {
        const raw = lexeme.collocations as unknown;

        if (Array.isArray(raw)) {
            collocations = raw.filter((x): x is string => typeof x === "string");
        } else if (typeof raw === "string") {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    collocations = parsed.filter((x: unknown): x is string => typeof x === "string");
                }
            } catch {
                // ignore
            }
        }
    }

    // -------- Translations -> { [lang]: text } --------
    const translations =
        lexeme.translations.length > 0
            ? lexeme.translations.reduce<Record<string, string>>((acc, t) => {
                acc[t.lang] = t.text;
                return acc;
            }, {})
            : undefined;

    // -------- Morphology --------
    // Prefer explicitly passed token (per-click), fall back to the first lexeme token.
    const tokenForMorphology: Token | undefined =
        opts?.token ?? lexeme.tokens[0];

    let morphology: LexemeCard["morphology"] | undefined;

    if (tokenForMorphology) {
        const featsJson = tokenForMorphology.feats as unknown;
        const features: Record<string, string> = {};

        if (featsJson && typeof featsJson === "object" && !Array.isArray(featsJson)) {
            for (const [k, v] of Object.entries(featsJson)) {
                features[k] = String(v);
            }
        } else if (typeof featsJson === "string") {
            try {
                const parsed = JSON.parse(featsJson);
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
                        features[k] = String(v);
                    }
                }
            } catch {
                // ignore
            }
        }

        morphology = {
            surface: tokenForMorphology.surface,
            lemma: tokenForMorphology.lemma,
            pos: tokenForMorphology.pos,
            features,
        };
    }

    return {
        lemma: lexeme.lemma,
        pos: lexeme.pos,
        definition: primarySense?.def || lexeme.definition || "",
        ipa: lexeme.ipa ?? undefined,
        cefr: lexeme.cefr ?? undefined,
        audio:
            lexeme.audioUrlUS || lexeme.audioUrlUK
                ? {
                    us: lexeme.audioUrlUS ?? undefined,
                    uk: lexeme.audioUrlUK ?? undefined,
                }
                : undefined,
        example: exampleText ? { text: exampleText } : undefined,
        morphology,
        forms,
        transitivity: undefined, // still placeholder until you add a field in the schema
        collocations,
        frequency: lexeme.frequency ?? undefined,
        etymology: lexeme.etymology ?? undefined,
        translations,
        notes: lexeme.notes ?? undefined,
    };
}
