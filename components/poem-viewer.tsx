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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-2">
            <span className="text-xl">{data?.lemma ?? token.lemma}</span>
            <span className="text-sm font-normal text-zinc-600">
              {(data?.pos ?? token.pos) as string}
              {data?.cefr ? ` • ${data.cefr}` : ""}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-zinc-700">
          {data?.ipa && <span className="mr-2">{data.ipa}</span>}
          <AudioButton src={data?.audio?.us} />
        </div>

        <Tabs defaultValue="def" className="mt-3">
          <TabsList>
            <TabsTrigger value="def">Definition</TabsTrigger>
            <TabsTrigger value="gram">Grammar</TabsTrigger>
            <TabsTrigger value="more">More</TabsTrigger>
          </TabsList>

          <TabsContent value="def" className="mt-3 space-y-2">
            <p>{data?.definition ?? "—"}</p>
            {data?.example && (
              <p
                className="text-zinc-700"
                dangerouslySetInnerHTML={{ __html: data.example.text }}
              />
            )}
            <Button variant="outline" className="mt-2">
              Mark as learned
            </Button>
          </TabsContent>

          <TabsContent value="gram" className="mt-3 space-y-2">
            <p>
              <em>{token.surface}</em> →{" "}
              <strong>{data?.lemma ?? token.lemma}</strong>
            </p>
            {data?.morphology && (
              <pre className="bg-zinc-50 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(data.morphology.features, null, 2)}
              </pre>
            )}
            {data?.collocations && data.collocations.length > 0 && (
              <ul className="list-disc pl-5">
                {data.collocations.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="more" className="mt-3 space-y-2 text-sm">
            {data?.etymology && (
              <p>
                <b>Etymology:</b> {data.etymology}
              </p>
            )}
            {data?.frequency && (
              <p>
                <b>Frequency:</b> {data.frequency}
              </p>
            )}
          </TabsContent>
        </Tabs>

        <footer className="mt-4 flex justify-between text-sm">
          <a
            className="underline"
            href={`?w=${encodeURIComponent(data?.lemma ?? token.lemma)}&pos=${encodeURIComponent(
              data?.pos ?? token.pos,
            )}&token=${encodeURIComponent(token.id)}#lTODO`}
          >
            Permalink
          </a>
          <a
            className="underline"
            href={`mailto:editor@example.com?subject=Word%20issue:%20${encodeURIComponent(
              data?.lemma ?? token.lemma,
            )}`}
          >
            Report an issue
          </a>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function AudioButton({ src }: { src?: string }) {
  if (!src) return null;
  return <audio controls src={src} className="w-full mt-1" />;
}
