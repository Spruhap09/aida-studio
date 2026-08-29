"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { Nav } from "@/components/Nav";
import { fetchHealth, fetchLessons } from "@/lib/api";
import { readSse, studioChat } from "@/lib/sse";
import type { Lesson } from "@/lib/types";

export default function ClayPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [agentsOn, setAgentsOn] = useState(false);
  const [log, setLog] = useState<{ agent?: string; text: string }[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>("pinch-pot");

  useEffect(() => {
    fetchLessons().then(setLessons).catch(() => setLessons([]));
    fetchHealth()
      .then((h) => setAgentsOn(h.agents))
      .catch(() => setAgentsOn(false));
  }, []);

  async function handleChat(message: string) {
    setBusy(true);
    setError(null);
    setLog((prev) => [...prev, { agent: "you", text: message }]);
    try {
      const res = await studioChat({
        message,
        thread_id: threadId,
        stitch_width: 80,
        max_colors: 12,
        aida_count: 14,
      });
      let agent = "clay_coach";
      let acc = "";
      await readSse(res, (event) => {
        if (event.type === "thread") setThreadId(event.thread_id);
        if (event.type === "agent") {
          agent = event.name;
          acc = "";
        }
        if (event.type === "token") {
          acc += event.text;
          const snapshot = acc;
          const who = event.agent || agent;
          setLog((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.agent === who && last.agent !== "you") {
              next[next.length - 1] = { agent: who, text: snapshot };
            } else next.push({ agent: who, text: snapshot });
            return next;
          });
        }
        if (event.type === "message") {
          setLog((prev) => [...prev, { agent: event.agent || agent, text: event.text }]);
        }
        if (event.type === "error") setError(event.message);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Nav active="clay" />
      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-clay">Clay</p>
          <h1 className="font-display text-4xl md:text-5xl">Start with your hands, not the kiln.</h1>
          <p className="mt-3 max-w-xl text-ink/70">
            ClayCoach only teaches from these lessons. That is grounding: the model looks up pinch, coil, slab,
            drying, and joining instead of inventing firing schedules.
          </p>
          {!agentsOn && (
            <p className="mt-3 rounded-xl bg-gold/20 px-3 py-2 text-sm">
              Lessons below work without a key. Add <code>api/.env</code> to ask ClayCoach questions.
            </p>
          )}
          {error && <p className="mt-3 text-sm text-thread">{error}</p>}
          <div className="mt-8 space-y-3">
            {lessons.map((lesson) => (
              <article key={lesson.id} className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-card">
                <button className="flex w-full items-baseline justify-between gap-3 text-left" onClick={() => setOpenId(lesson.id)} type="button">
                  <span>
                    <span className="font-display text-2xl">{lesson.title}</span>
                    <span className="ml-2 text-xs uppercase tracking-wide text-clay">
                      {lesson.minutes} min
                    </span>
                  </span>
                </button>
                {(openId === lesson.id) && <p className="mt-3 text-ink/75">{lesson.body}</p>}
              </article>
            ))}
          </div>
        </div>
        <ChatPanel log={log} busy={busy} onSend={handleChat} />
      </main>
    </div>
  );
}
