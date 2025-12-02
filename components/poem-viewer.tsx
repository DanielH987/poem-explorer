"use client";

import { JSX, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { WordDialog } from "@/components/word-explorer-dialog";
import type { LexemeCard } from "@/lib/lexeme-card";

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

export default function PoemViewer({
  // poem,
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
  return (
    <div className="leading-8" data-line={line.index}>
      {parts}
    </div>
  );
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
  const [isHovering, setIsHovering] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ["lexeme", token.lemma, token.pos],
    queryFn: async () => {
      const r = await fetch(
        `/api/lexeme?lemma=${encodeURIComponent(
          token.lemma,
        )}&pos=${encodeURIComponent(token.pos)}`,
      );
      return (await r.json()) as LexemeCard;
    },
    enabled: isHovering || active,
    staleTime: 60_000,
  });

  const trigger = (
    <span
      tabIndex={0}
      data-token-id={token.id}
      className={`token inline-block rounded-sm px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${active ? "bg-yellow-100" : ""
        }`}
      onClick={() => onActivate(token.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onActivate(token.id);
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {token.surface}
    </span>
  );

  const word = data?.lemma ?? token.lemma;

  return (
    <>
      <HoverCard openDelay={100} closeDelay={80}>
        <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
        <HoverCardContent className="w-64">
          <div className="text-sm">
            <div className="font-semibold">
              {word} ·{" "}
              <span className="uppercase text-zinc-600">
                {data?.pos ?? token.pos}
              </span>
            </div>
            <p className="mt-1 text-zinc-700">
              {isFetching && !data ? "Loading…" : data?.definition ?? "—"}
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>

      <WordDialog
        open={active}
        lexeme={data}
        fallbackWord={token.lemma}
        onOpenChange={(open) => {
          if (!open) onActivate(undefined);
        }}
      />
    </>
  );
}
