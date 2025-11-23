"use client";

import { JSX, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronRight, ChevronDown, ChevronLeft } from "lucide-react";

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
    enabled: isHovering || active, // fetch on hover or when modal opens
    staleTime: 60_000,
  });

  // Hover card (desktop) + click to open dialog
  const trigger = (
    <span
      tabIndex={0}
      data-token-id={token.id}
      className={`token inline-block rounded-sm px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${active ? "bg-yellow-100" : ""}`}
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

  return (
    <>
      <HoverCard openDelay={100} closeDelay={80}>
        <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
        <HoverCardContent className="w-64">
          <div className="text-sm">
            <div className="font-semibold">
              {data?.lemma ?? token.lemma} ·{" "}
              <span className="uppercase text-zinc-600">{data?.pos ?? token.pos}</span>
            </div>
            <p className="mt-1 text-zinc-700">
              {isFetching && !data ? "Loading…" : data?.definition ?? "—"}
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>

      <WordDialog
        open={active}
        data={data}
        token={token}
        onOpenChange={(open) => {
          if (!open) onActivate(undefined);
        }}
      />
    </>
  );
}

function WordDialog({
  open,
  data,
  token,
  onOpenChange,
}: {
  open: boolean;
  data?: LexemeCard;
  token: Token;
  onOpenChange: (open: boolean) => void;
}) {
  const word = data?.lemma ?? token.lemma;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-transparent border-none shadow-none p-0">
        <div className="relative w-[320px] h-[320px] mx-auto">

          {/* OUTER RING */}
          <div
            className="
              absolute top-1/2 left-1/2
              -translate-x-1/2 -translate-y-1/2
              w-64 h-64
              rounded-full
              border border-zinc-200
              bg-zinc-50
              shadow-md
              relative
            "
          >
            {/* CROSSHAIR TO VISIBLY DIVIDE INTO 4 */}
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="
                  absolute top-1/2 left-1/2
                  -translate-x-1/2 -translate-y-1/2
                  w-[100%] h-px
                  bg-zinc-200
                  rotate-45
                "
              />
              <div
                className="
                  absolute top-1/2 left-1/2
                  -translate-x-1/2 -translate-y-1/2
                  w-[100%] h-px
                  bg-zinc-200
                  -rotate-45
                "
              />
            </div>

            {/* TOP BUTTON (QUADRANT 1) */}
            <button
              type="button"
              className="
                absolute
                top-3 left-1/2
                -translate-x-1/2
                flex items-center justify-center
                w-10 h-10
                rounded-full
                bg-white
                shadow
                text-zinc-700
                hover:bg-zinc-100
                transition-colors
              "
              aria-label="Top action"
            >
              <ChevronUp className="w-5 h-5" />
            </button>

            {/* RIGHT BUTTON (QUADRANT 2) */}
            <button
              type="button"
              className="
                absolute
                right-3 top-1/2
                -translate-y-1/2
                flex items-center justify-center
                w-10 h-10
                rounded-full
                bg-white
                shadow
                text-zinc-700
                hover:bg-zinc-100
                transition-colors
              "
              aria-label="Right action"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* BOTTOM BUTTON (QUADRANT 3) */}
            <button
              type="button"
              className="
                absolute
                bottom-3 left-1/2
                -translate-x-1/2
                flex items-center justify-center
                w-10 h-10
                rounded-full
                bg-white
                shadow
                text-zinc-700
                hover:bg-zinc-100
                transition-colors
              "
              aria-label="Bottom action"
            >
              <ChevronDown className="w-5 h-5" />
            </button>

            {/* LEFT BUTTON (QUADRANT 4) */}
            <button
              type="button"
              className="
                absolute
                left-3 top-1/2
                -translate-y-1/2
                flex items-center justify-center
                w-10 h-10
                rounded-full
                bg-white
                shadow
                text-zinc-700
                hover:bg-zinc-100
                transition-colors
              "
              aria-label="Left action"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* CENTER WORD CIRCLE */}
          <div
            className="
              absolute top-1/2 left-1/2
              -translate-x-1/2 -translate-y-1/2
              w-36 h-36
              rounded-full
              bg-white
              shadow-lg
              border border-zinc-200
              flex items-center justify-center
              text-xl font-semibold
              text-zinc-900
              z-10
            "
          >
            <span className="px-4 text-center break-words">{word}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AudioButton({ src }: { src?: string }) {
  if (!src) return null;
  return <audio controls src={src} className="w-full mt-1" />;
}
