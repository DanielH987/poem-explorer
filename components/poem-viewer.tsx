"use client";
import { JSX, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type Line = { id: string; index: number; text: string };
type Token = {
  id: string;
  lineId: string;
  start: number;
  end: number;
  surface: string;
  lemma: string;
  pos: string;
};
type LexemeCard = {
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

export default function PoemViewer({
  poem,
  lines,
  tokens,
  deepLink,
}: {
  poem: { id: string; slug: string; title: string };
  lines: Line[];
  tokens: Token[];
  deepLink?: { w?: string; pos?: string; token?: string };
}) {
  const byLine = useMemo(() => {
    const map: Record<string, Token[]> = {};
    for (const t of tokens) (map[t.lineId] ||= []).push(t);
    for (const k in map) map[k].sort((a, b) => a.start - b.start);
    return map;
  }, [tokens]);

  const [activeToken, setActiveToken] = useState<string | undefined>(
    deepLink?.token,
  );

  useEffect(() => {
    if (deepLink?.token) setActiveToken(deepLink.token);
  }, [deepLink?.token]);

  return (
    <div className="space-y-2">
      {lines.map((l) => (
        <PoemLine
          key={l.id}
          line={l}
          tokens={byLine[l.id] || []}
          activeToken={activeToken}
          onActivate={setActiveToken}
        />
      ))}
    </div>
  );
}

function PoemLine({
  line,
  tokens,
  activeToken,
  onActivate,
}: {
  line: Line;
  tokens: Token[];
  activeToken?: string;
  onActivate: (id?: string) => void;
}) {
  const parts: JSX.Element[] = [];
  let cursor = 0;
  for (const t of tokens) {
    const before = line.text.slice(cursor, t.start);
    if (before) parts.push(<span key={cursor}>{before}</span>);
    parts.push(
      <TokenSpan
        key={t.id}
        token={t}
        active={t.id === activeToken}
        onActivate={onActivate}
      />,
    );
    cursor = t.end;
  }
  const tail = line.text.slice(cursor);
  if (tail) parts.push(<span key={cursor + "tail"}>{tail}</span>);
  return <div className="leading-8" data-line={line.index}>{parts}</div>;
}

function TokenSpan({
  token,
  active,
  onActivate,
}: {
  token: Token;
  active: boolean;
  onActivate: (id?: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const { data } = useQuery({
    queryKey: ["lexeme", token.lemma, token.pos],
    queryFn: async () => {
      const r = await fetch(
        `/api/lexeme?lemma=${encodeURIComponent(token.lemma)}&pos=${encodeURIComponent(token.pos)}`
      );
      return (await r.json()) as LexemeCard;
    },
    enabled: hover || active,
    staleTime: 60_000,
  });

  return (
    <span
      tabIndex={0}
      data-token-id={token.id}
      className={`token ${active ? "bg-yellow-100" : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onActivate(token.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onActivate(token.id);
      }}
    >
      {token.surface}
      {hover && data && <HoverCard data={data} />}
      {active && data && (
        <WordModal data={data} token={token} onClose={() => onActivate(undefined)} />
      )}
    </span>
  );
}

function HoverCard({ data }: { data: LexemeCard }) {
  return (
    <span className="absolute translate-y-6 z-10 bg-white border rounded shadow p-2 text-sm">
      <b>{data.lemma}</b> · <em>{data.pos}</em>
      <div className="text-zinc-700 mt-1 max-w-xs">{data.definition}</div>
    </span>
  );
}

function WordModal({
  data,
  token,
  onClose,
}: {
  data: LexemeCard;
  token: Token;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"def" | "gram" | "more">("def");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-labelledby="word-title"
      className="fixed inset-0 z-20 grid place-items-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded shadow-xl max-w-lg w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <h2 id="word-title" className="text-xl font-semibold">
            {data.lemma}{" "}
            <span className="text-sm text-zinc-600">
              {data.pos} {data.cefr ? `• ${data.cefr}` : ""}
            </span>
          </h2>
          <button className="border rounded px-2" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="text-sm text-zinc-600">
          {data.ipa} <AudioButton src={data.audio?.us} />
        </div>
        <nav className="mt-3 flex gap-2 text-sm">
          <button
            className={`px-2 py-1 border rounded ${tab === "def" && "bg-zinc-100"}`}
            onClick={() => setTab("def")}
          >
            Definition
          </button>
          <button
            className={`px-2 py-1 border rounded ${tab === "gram" && "bg-zinc-100"}`}
            onClick={() => setTab("gram")}
          >
            Grammar
          </button>
          <button
            className={`px-2 py-1 border rounded ${tab === "more" && "bg-zinc-100"}`}
            onClick={() => setTab("more")}
          >
            More
          </button>
        </nav>

        {tab === "def" && (
          <section className="mt-3 space-y-2">
            <p>{data.definition}</p>
            {data.example && (
              <p
                className="text-zinc-700"
                dangerouslySetInnerHTML={{ __html: data.example.text }}
              />
            )}
            <button className="mt-2 border rounded px-2 py-1">Mark as learned</button>
          </section>
        )}

        {tab === "gram" && (
          <section className="mt-3 space-y-2">
            <p>
              <em>{token.surface}</em> → <strong>{data.lemma}</strong>
            </p>
            {data.morphology && (
              <pre className="bg-zinc-50 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(data.morphology.features, null, 2)}
              </pre>
            )}
            {data.collocations && (
              <ul className="list-disc pl-5">
                {data.collocations.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "more" && (
          <section className="mt-3 space-y-2 text-sm">
            {data.etymology && (
              <p>
                <b>Etymology:</b> {data.etymology}
              </p>
            )}
            {data.frequency && (
              <p>
                <b>Frequency:</b> {data.frequency}
              </p>
            )}
          </section>
        )}

        <footer className="mt-4 flex justify-between text-sm">
          <a
            className="underline"
            href={`?w=${encodeURIComponent(data.lemma)}&pos=${encodeURIComponent(
              data.pos,
            )}&token=${encodeURIComponent(token.id)}#lTODO`}
          >
            Permalink
          </a>
          <a
            className="underline"
            href={`mailto:editor@example.com?subject=Word%20issue:%20${encodeURIComponent(
              data.lemma,
            )}`}
          >
            Report an issue
          </a>
        </footer>
      </div>
    </div>
  );
}

function AudioButton({ src }: { src?: string }) {
  if (!src) return null;
  return <audio controls src={src} className="w-full mt-1" />;
}
