"use client";

import { useState } from "react";
import type { InterruptEvent } from "@/lib/types";

export function ChatPanel({
  onSend,
  onResume,
  busy,
  interrupt,
  log,
}: {
  onSend: (message: string) => void;
  onResume?: (approved: boolean, maxColors?: number) => void;
  busy: boolean;
  interrupt?: InterruptEvent | null;
  log: { agent?: string; text: string }[];
}) {
  const [text, setText] = useState("");
  const [colors, setColors] = useState(interrupt?.palette?.length ?? 12);

  return (
    <section className="flex h-full min-h-[28rem] flex-col rounded-2xl border border-ink/10 bg-white/80 shadow-card">
      <header className="border-b border-ink/10 px-5 py-4">
        <h2 className="font-display text-2xl">Studio agents</h2>
        <p className="text-sm text-ink/60">Supervisor routes to PatternConverter, StitchCoach, Recommender, or ClayCoach.</p>
      </header>
      <div className="flex-1 space-y-3 overflow-auto px-5 py-4">
        {log.length === 0 && (
          <p className="text-sm text-ink/50">
            Ask for a harder next project, a technique, or — with a photo attached — a conversion.
          </p>
        )}
        {log.map((entry, i) => (
          <article key={i} className="rounded-xl bg-mist px-3 py-2">
            {entry.agent && (
              <p className="mb-1 text-[11px] uppercase tracking-wide text-moss">{entry.agent.replaceAll("_", " ")}</p>
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{entry.text}</p>
          </article>
        ))}
        {interrupt?.palette && onResume && (
          <div className="rounded-xl border border-gold/40 bg-gold/10 p-3">
            <p className="text-sm font-medium">Approve this palette?</p>
            <p className="text-xs text-ink/60">
              {interrupt.palette.length} colors
              {interrupt.difficulty ? ` · ${interrupt.difficulty.level}` : ""}
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm">
              Re-convert with
              <input
                type="number"
                min={4}
                max={40}
                className="w-16 rounded border border-ink/15 bg-white px-2 py-1"
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
              <button className="rounded-full px-4 py-1.5 text-sm" onClick={() => onResume(false)} type="button">
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
      <form
        className="flex gap-2 border-t border-ink/10 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim() || busy) return;
          onSend(text.trim());
          setText("");
        }}
      >
        <input
          className="flex-1 rounded-full border border-ink/15 bg-paper px-4 py-2 text-sm outline-none focus:border-moss"
          placeholder="Ask the studio…"
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
