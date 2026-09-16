"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ChartViewer } from "@/components/ChartViewer";
import { ChatPanel } from "@/components/ChatPanel";
import { Nav } from "@/components/Nav";
import { PaletteLegend } from "@/components/PaletteLegend";
import { convertPattern, fetchCatalog, fetchHealth, fileToDataUrl } from "@/lib/api";
import { readSse, studioChat, studioResume } from "@/lib/sse";
import type { CatalogItem, InterruptEvent, Pattern } from "@/lib/types";

function looksInternal(text: string) {
  const trimmed = text.trim();
  return trimmed.startsWith("{") && /"(rationale|display_name|technique|explanation|known_techniques)"/.test(trimmed);
}

export default function StitchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState(100);
  const [colors, setColors] = useState(16);
  const [aida, setAida] = useState(14);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [agentsOn, setAgentsOn] = useState(false);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [log, setLog] = useState<{ agent?: string; text: string }[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [interrupt, setInterrupt] = useState<InterruptEvent | null>(null);
  const [chatBusy, setChatBusy] = useState(false);

  useEffect(() => {
    fetchHealth()
      .then((h) => setAgentsOn(h.agents))
      .catch(() => setAgentsOn(false));
    fetchCatalog()
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, []);

  async function onConvert(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setPattern(await convertPattern(file, width, colors, aida));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Convert failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleChat(message: string) {
    setChatBusy(true);
    setError(null);
    setInterrupt(null);
    setLog((prev) => [...prev, { agent: "you", text: message }]);
    try {
      const image_base64 = file ? await fileToDataUrl(file) : null;
      const res = await studioChat({
        message,
        thread_id: threadId,
        image_base64,
        stitch_width: width,
        max_colors: colors,
        aida_count: aida,
      });
      await consumeStream(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setChatBusy(false);
    }
  }

  async function handleResume(approved: boolean, maxColors?: number) {
    if (!threadId) return;
    setChatBusy(true);
    try {
      const res = await studioResume({ thread_id: threadId, approved, max_colors: maxColors });
      setInterrupt(null);
      await consumeStream(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resume failed");
    } finally {
      setChatBusy(false);
    }
  }

  async function consumeStream(res: Response) {
    let agent = "studio";
    let acc = "";
    await readSse(res, (event) => {
      if (event.type === "thread" && event.thread_id) setThreadId(event.thread_id);
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
          } else {
            next.push({ agent: who, text: snapshot });
          }
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
      if (event.type === "pattern") setPattern(event.pattern);
      if (event.type === "interrupt") setInterrupt(event);
      if (event.type === "error") setError(event.message);
    });
  }

  return (
    <div className="min-h-screen">
      <Nav active="stitch" />
      <main className="mx-auto grid max-w-6xl items-start gap-8 px-6 py-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <header>
            <p className="text-sm uppercase tracking-[0.18em] text-thread">Cross-stitch</p>
            <h1 className="font-display text-4xl md:text-5xl">Make the next piece a little harder.</h1>
            <p className="mt-2 max-w-xl text-ink/70">
              Conversion is Python: k-means in Lab, nearest DMC by CIEDE2000. Agents coach, route, and wait for
              palette approval.
            </p>
            {!agentsOn && (
              <p className="mt-3 rounded-xl bg-gold/20 px-3 py-2 text-sm">
                Conversion works now. Add an API key to <code>api/.env</code> to enable the studio agents.
              </p>
            )}
          </header>

          <form onSubmit={onConvert} className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-card">
            <label className="block text-sm font-medium">Photo</label>
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <NumberField label="Stitch width" value={width} min={24} max={220} onChange={setWidth} />
              <NumberField label="Max colors" value={colors} min={4} max={40} onChange={setColors} />
              <NumberField label="Aida count" value={aida} min={11} max={22} onChange={setAida} />
            </div>
            <button
              type="submit"
              disabled={!file || busy}
              className="mt-4 rounded-full bg-thread px-5 py-2 text-sm text-paper disabled:opacity-40"
            >
              {busy ? "Matching floss…" : "Convert to pattern"}
            </button>
            {error && <p className="mt-3 text-sm text-thread">{error}</p>}
          </form>

          {pattern && (
            <>
              <ChartViewer pattern={pattern} />
              <PaletteLegend pattern={pattern} />
              <div className="rounded-2xl bg-moss/10 p-4 text-sm">
                <p className="font-medium">Stretch goals</p>
                <ul className="mt-2 list-disc pl-5 text-ink/70">
                  {pattern.difficulty.stretch_goals.map((goal) => (
                    <li key={goal}>{goal}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {catalog.length > 0 && (
            <section>
              <h2 className="font-display text-2xl">Catalog briefs</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {catalog.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-ink/10 bg-white/70 p-4">
                    <p className="text-xs uppercase tracking-wide text-moss">{item.level}</p>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-ink/65">{item.why}</p>
                    <p className="mt-2 text-xs text-ink/50">
                      ~{item.hours}h · {item.colors} colors · {item.techniques.join(", ")}
                    </p>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs font-medium text-moss underline underline-offset-2 hover:text-ink"
                      >
                        Find similar free patterns
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="min-h-0 w-full lg:sticky lg:top-20 lg:self-start">
          <ChatPanel
            log={log}
            busy={chatBusy}
            interrupt={interrupt}
            onSend={handleChat}
            onResume={handleResume}
          />
        </aside>
      </main>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-ink/15 bg-paper px-2 py-1"
      />
    </label>
  );
}
