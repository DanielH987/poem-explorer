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

export type LexemeWithRelations = Lexeme & {
    senses: Sense[];
    translations: Translation[];
};

export function lexemeToLexemeCard(
    lexeme: LexemeWithRelations,
    opts?: { token?: Token | null }
): LexemeCard {
    const primarySense = lexeme.senses[0] ?? null;

    type ExampleEntry = { text: string };

    let exampleText: string | undefined;

    if (primarySense?.examples && Array.isArray(primarySense.examples)) {
        const examples = primarySense.examples as ExampleEntry[];
        exampleText = examples[0]?.text;
    }

    // forms: Json? (ideally stored as { [label: string]: string })
    let forms: Record<string, string> | undefined;
    if (lexeme.forms && typeof lexeme.forms === "object" && !Array.isArray(lexeme.forms)) {
        forms = lexeme.forms as Record<string, string>;
    }

    // collocations: Json? (ideally stored as string[])
    let collocations: string[] | undefined;
    if (Array.isArray(lexeme.collocations)) {
        collocations = lexeme.collocations as string[];
    }

    // translations -> { [lang]: text }
    const translations =
        lexeme.translations.length > 0
            ? lexeme.translations.reduce<Record<string, string>>((acc, t) => {
                acc[t.lang] = t.text;
                return acc;
            }, {})
            : undefined;

    // morphology: we can enrich this on the frontend from TokenSpan,
    // but if you want the API to include it too, you can pass a Token here.
    let morphology: LexemeCard["morphology"] | undefined;
    if (opts?.token) {
        const featsJson = opts.token.feats;
        // normalize feats into Record<string, string>
        const features: Record<string, string> = {};
        if (featsJson && typeof featsJson === "object" && !Array.isArray(featsJson)) {
            for (const [k, v] of Object.entries(featsJson)) {
                features[k] = String(v);
            }
        }

        morphology = {
            surface: opts.token.surface,
            lemma: opts.token.lemma,
            pos: opts.token.pos,
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
        transitivity: undefined, // you can add a field to Lexeme later if you want
        collocations,
        frequency: lexeme.frequency ?? undefined,
        etymology: lexeme.etymology ?? undefined,
        translations,
        notes: lexeme.notes ?? undefined,
    };
}
