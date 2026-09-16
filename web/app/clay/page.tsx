"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { LessonVideo } from "@/components/LessonVideo";
import { Nav } from "@/components/Nav";
import { fetchHealth, fetchLessons } from "@/lib/api";
import fallbackLessons from "@/data/clay-lessons.json";
import { readSse, studioChat } from "@/lib/sse";
import type { Lesson } from "@/lib/types";

function looksInternal(text: string) {
  const trimmed = text.trim();
  return trimmed.startsWith("{") && /"(rationale|display_name|technique|explanation|known_techniques)"/.test(trimmed);
}

function clipsFor(lesson: Lesson) {
  if (lesson.videos && lesson.videos.length > 0) return lesson.videos;
  return lesson.video ? [lesson.video] : [];
}

export default function ClayPage() {
  const [lessons, setLessons] = useState<Lesson[]>(fallbackLessons as Lesson[]);
  const [agentsOn, setAgentsOn] = useState(false);
  const [log, setLog] = useState<{ agent?: string; text: string }[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLessons = useCallback(() => {
    fetchLessons()
      .then((data) => {
        if (data.length > 0) setLessons(data);
      })
      .catch(() => {
        setLessons(fallbackLessons as Lesson[]);
      });
    fetchHealth()
      .then((h) => setAgentsOn(h.agents))
      .catch(() => setAgentsOn(false));
  }, []);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

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
          if (event.name === "supervisor") return;
          if (event.name !== agent) acc = "";
          agent = event.name;
        }
        if (event.type === "token") {
          if (looksInternal(event.text) || event.agent === "supervisor") return;
          acc += event.text;
          const snapshot = acc;
          const who = event.agent || agent;
          if (who === "supervisor") return;
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
          if (looksInternal(event.text) || event.agent === "supervisor") return;
          const who = event.agent || agent;
          setLog((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.agent === who && last.agent !== "you") {
              next[next.length - 1] = { agent: who, text: event.text };
              return next;
            }
            return [...prev, { agent: who, text: event.text }];
          });
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
      <main className="mx-auto grid max-w-6xl items-start gap-8 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-clay">Clay for beginners</p>
          <h1 className="font-display text-4xl md:text-5xl">Never used clay? Start here.</h1>
          <p className="mt-3 max-w-xl text-ink/70">
            Do the seven how-tos in order. These are for <span className="text-ink">air-dry clay</span> — it hardens
            on a shelf, no kiln. Each card has a short video. Watch someone do it, then follow the steps.
          </p>
          <p className="mt-4 text-sm text-ink/55">
            Knead → small bowl → stick pieces on → cup or tile → dry slowly
          </p>
          <div className="mt-5 rounded-2xl border border-ink/10 bg-white/70 px-4 py-3 text-sm text-ink/75">
            <p className="font-medium text-ink">What you need</p>
            <p className="mt-1">A pack of air-dry clay, a fork, a cup of water, a plastic bag, and a table you can wipe.</p>
          </div>
          {!agentsOn && (
            <p className="mt-3 rounded-xl bg-gold/20 px-3 py-2 text-sm">
              The coach on the right needs a connection. You can still follow every step on this page.
            </p>
          )}
          {error && <p className="mt-3 text-sm text-thread">{error}</p>}
          <ol className="mt-8 space-y-5">
            {lessons.map((lesson) => {
              const clips = clipsFor(lesson);
              return (
              <li key={lesson.id}>
                <article className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-card">
                  <header className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl">{lesson.title}</h2>
                      <p className="mt-1 text-sm text-ink/70">{lesson.plain ?? lesson.body}</p>
                    </div>
                    <span className="shrink-0 text-xs uppercase tracking-wide text-clay">{lesson.minutes} min</span>
                  </header>
                  {lesson.why && (
                    <p className="mt-3 text-sm text-ink/60">
                      <span className="font-medium text-ink">Why: </span>
                      {lesson.why}
                    </p>
                  )}
                  {clips.length > 0 && (
                    <div className="mt-4 space-y-4">
                      <p className="text-sm font-medium text-ink">Watch someone do this</p>
                      {clips.map((clip) => (
                        <LessonVideo
                          key={clip.youtubeId}
                          credit={clip.credit}
                          heading={null}
                          title={clip.title}
                          youtubeId={clip.youtubeId}
                        />
                      ))}
                    </div>
                  )}
                  {lesson.steps && lesson.steps.length > 0 && (
                    <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink/85">
                      {lesson.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  )}
                  {lesson.doneWhen && (
                    <p className="mt-4 rounded-xl bg-paper/90 px-4 py-3 text-sm text-ink/80">
                      <span className="font-medium text-ink">You are done when: </span>
                      {lesson.doneWhen}
                    </p>
                  )}
                  {lesson.terms && lesson.terms.length > 0 && (
                    <dl className="mt-4 space-y-1 text-sm text-ink/60">
                      {lesson.terms.map((term) => (
                        <div key={term.word}>
                          <dt className="inline font-medium text-ink/80">{term.word}: </dt>
                          <dd className="inline">{term.meaning}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {lesson.ask && (
                    <button
                      className="mt-4 rounded-full bg-clay px-4 py-2 text-sm text-white disabled:opacity-40"
                      disabled={busy}
                      onClick={() => handleChat(lesson.ask!)}
                      type="button"
                    >
                      Ask about this
                    </button>
                  )}
                </article>
              </li>
              );
            })}
          </ol>
        </div>
        <aside className="min-h-0 w-full lg:sticky lg:top-20 lg:self-start">
          <ChatPanel
            log={log}
            busy={busy}
            onSend={handleChat}
            title="ClayCoach"
            subtitle="Stuck? Ask the way you would ask a friend at the table."
            emptyHint="Try: My bowl is thicker on one side. or How do I stick a handle on?"
            placeholder="Ask about cracking, handles, drying…"
          />
        </aside>
      </main>
    </div>
  );
}
