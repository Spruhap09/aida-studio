"use client";

import { useEffect, useRef, useState } from "react";
import type { InterruptEvent } from "@/lib/types";

const AGENT_LOOK: Record<string, { label: string; mark: string; bubble: string; chip: string; avatar: string }> = {
  you: {
    label: "You",
    mark: "You",
    bubble: "bg-thread text-paper rounded-2xl rounded-br-md",
    chip: "text-paper/80",
    avatar: "bg-thread text-paper",
  },
  stitch_coach: {
    label: "Stitch coach",
    mark: "St",
    bubble: "bg-white border border-moss/20 text-ink rounded-2xl rounded-bl-md",
    chip: "text-moss",
    avatar: "bg-moss text-white",
  },
  recommender: {
    label: "Recommender",
    mark: "Re",
    bubble: "bg-white border border-gold/40 text-ink rounded-2xl rounded-bl-md",
    chip: "text-amber-800",
    avatar: "bg-gold text-ink",
  },
  pattern_converter: {
    label: "Pattern converter",
    mark: "Pt",
    bubble: "bg-white border border-thread/20 text-ink rounded-2xl rounded-bl-md",
    chip: "text-thread",
    avatar: "bg-thread text-paper",
  },
  clay_coach: {
    label: "Clay coach",
    mark: "Cl",
    bubble: "bg-white border border-clay/30 text-ink rounded-2xl rounded-bl-md",
    chip: "text-clay",
    avatar: "bg-clay text-white",
  },
};

const FALLBACK = {
  label: "Studio",
  mark: "Ai",
  bubble: "bg-white border border-ink/10 text-ink rounded-2xl rounded-bl-md",
  chip: "text-ink/60",
  avatar: "bg-ink text-paper",
};

export function ChatPanel({
  onSend,
  onResume,
  busy,
  interrupt,
  log,
  title = "Studio agents",
  subtitle = "You on the right. Specialists on the left, color-coded by role.",
  emptyHint = "Ask for a slightly harder project, a technique, or attach a photo to convert.",
  placeholder = "Ask the studio…",
}: {
  onSend: (message: string) => void;
  onResume?: (approved: boolean, maxColors?: number) => void;
  busy: boolean;
  interrupt?: InterruptEvent | null;
  log: { agent?: string; text: string }[];
  title?: string;
  subtitle?: string;
  emptyHint?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [colors, setColors] = useState(interrupt?.palette?.length ?? 12);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [log, interrupt, busy]);

  return (
    <section className="flex h-[min(32rem,calc(100dvh-8rem))] max-h-[calc(100dvh-8rem)] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-[linear-gradient(180deg,#faf6ef_0%,#f4eadc_100%)] shadow-card lg:h-[calc(100dvh-8rem)]">
      <header className="shrink-0 border-b border-ink/10 bg-white/70 px-5 py-4 backdrop-blur">
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="text-sm text-ink/60">{subtitle}</p>
      </header>
      <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
        {log.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-white/50 px-4 py-6 text-center text-sm text-ink/55">
            {emptyHint}
          </div>
        )}
        {log.map((entry, i) => {
          const key = entry.agent === "you" ? "you" : (entry.agent ?? "studio");
          const look = AGENT_LOOK[key] ?? { ...FALLBACK, label: prettyAgent(key) };
          const mine = key === "you";
          return (
            <article key={i} className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-wide ${look.avatar}`}
                aria-hidden
              >
                {look.mark}
              </span>
              <div className={`max-w-[85%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <p className={`px-1 text-[11px] font-medium uppercase tracking-wide ${look.chip}`}>{look.label}</p>
                <div className={`px-3.5 py-2.5 shadow-sm ${look.bubble}`}>
                  {mine ? (
                    <p className="text-sm leading-relaxed">{entry.text}</p>
                  ) : (
                    <FormattedBody text={entry.text} />
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {busy && (
          <article className="flex gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/10 text-[11px] font-semibold text-ink/50">
              …
            </span>
            <div className="rounded-2xl rounded-bl-md border border-ink/10 bg-white px-4 py-3 shadow-sm">
              <span className="flex gap-1">
                <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-moss [animation-delay:-0.2s]" />
                <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-moss [animation-delay:-0.1s]" />
                <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-moss" />
              </span>
            </div>
          </article>
        )}
        {interrupt?.palette && onResume && (
          <div className="rounded-2xl border border-gold/50 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium">Approve this palette?</p>
            <p className="text-xs text-ink/60">
              {interrupt.palette.length} colors
              {interrupt.difficulty ? ` · ${interrupt.difficulty.level}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {interrupt.palette.map((floss) => (
                <span
                  key={floss.code}
                  title={`DMC ${floss.code} ${floss.name}`}
                  className="h-7 w-7 rounded-md border border-ink/10"
                  style={{ background: floss.hex }}
                />
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              Re-convert with
              <input
                type="number"
                min={4}
                max={40}
                className="w-16 rounded border border-ink/15 bg-paper px-2 py-1"
                value={colors}
                onChange={(e) => setColors(Number(e.target.value))}
              />
              colors
            </label>
            <div className="mt-3 flex gap-2">
              <button
                className="rounded-full bg-moss px-4 py-1.5 text-sm text-white"
                onClick={() => onResume(true, colors)}
                type="button"
              >
                Approve
              </button>
              <button className="rounded-full px-4 py-1.5 text-sm text-ink/70" onClick={() => onResume(false)} type="button">
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
      <form
        className="flex shrink-0 gap-2 border-t border-ink/10 bg-white/80 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim() || busy) return;
          onSend(text.trim());
          setText("");
        }}
      >
        <input
          className="flex-1 rounded-full border border-ink/15 bg-paper px-4 py-2 text-sm outline-none focus:border-moss"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="rounded-full bg-ink px-4 py-2 text-sm text-paper disabled:opacity-40"
          disabled={busy || !text.trim()}
          type="submit"
        >
          Send
        </button>
      </form>
    </section>
  );
}

function prettyAgent(id: string) {
  return id.replaceAll("_", " ");
}

function FormattedBody({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((line) => line.length > 0);
        const list = lines.length > 1 && lines.every((line) => /^\s*([-*]|\d+\.)\s+/.test(line));
        if (list) {
          const ordered = /^\s*\d+\./.test(lines[0]);
          const List = ordered ? "ol" : "ul";
          return (
            <List key={i} className={ordered ? "list-decimal space-y-1.5 pl-4" : "list-disc space-y-1.5 pl-4"}>
              {lines.map((line, j) => (
                <li key={j}>
                  <Inline text={line.replace(/^\s*([-*]|\d+\.)\s+/, "")} />
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <Inline text={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const chunks = text.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/[^\s<]+)/g);
  return (
    <>
      {chunks.map((chunk, i) => {
        const md = chunk.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
        if (md) {
          return (
            <a
              key={i}
              href={md[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all underline underline-offset-2"
            >
              {md[1]}
            </a>
          );
        }
        if (/^https?:\/\//.test(chunk)) {
          const href = chunk.replace(/[.,;:!?]+$/, "");
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all underline underline-offset-2"
            >
              {href}
            </a>
          );
        }
        const parts = chunk.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={`${i}-${j}`} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={`${i}-${j}`}>{part}</span>
          ),
        );
      })}
    </>
  );
}
