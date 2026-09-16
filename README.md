# Aida

A studio for **cross-stitch** and beginner **clay**. Python agents do the helping. TypeScript is only the UI.

You already stitch; the coach is built to push you toward harder work in small steps. Clay is a thin beginner track on purpose.

## What it is

Four specialist agents behind a supervisor:

| Agent | What it actually does |
| --- | --- |
| **Supervisor** | Routes your message to one specialist |
| **PatternConverter** | Turns a photo into a DMC chart, then pauses for palette approval |
| **StitchCoach** | Reads your skill profile, explains techniques, assigns a stretch goal |
| **Recommender** | Suggests original catalog briefs that fit your hours and colors |
| **ClayCoach** | Beginner hand-building, grounded in a local lesson pack |

**The chart is not an LLM.** Photos are quantized in CIELAB, then each cluster is matched to DMC floss with CIEDE2000. Agents call that pipeline as a tool. That split is the interview story.

## Run it

You need **Node 18+** and **Python 3.12**. If `node -v` is older (this machine had 16), put Node 22 first on `PATH`. A local copy can live under `vendor/` (gitignored):

```bash
export PATH="$(pwd)/vendor/node-v22.14.0-darwin-arm64/bin:$PATH"
```

```bash
# API
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add OPENAI_API_KEY (or ANTHROPIC_API_KEY) for agents
uvicorn app.main:app --reload --port 8000
```

```bash
# UI (second terminal)
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Convert a photo** works with no API key.
- **Chat with agents** needs a key in `api/.env`.

## Host it (portfolio demo)

This is two services. The UI is Next.js (`web/`). The API is FastAPI (`api/`).

1. Push the repo to GitLab.
2. Deploy `api/` on [Render](https://render.com) (see `render.yaml`). Set `OPENAI_API_KEY` and `CORS_ORIGINS` to your Vercel URL.
3. Deploy `web/` on [Vercel](https://vercel.com). Root directory: `web`. Set `API_URL` to the Render URL (no trailing slash).

Photo convert and clay lessons work without a model key. Chat needs a key and will spend credits if you leave it public — cap usage in the OpenAI dashboard.

## Layout

```
web/     Next.js UI (chart viewer, chat, clay lessons)
api/     FastAPI + LangGraph + stitch pipeline
api/app/agents/   supervisor graph
api/app/stitch/   color science, DMC matching, difficulty
api/app/clay/     grounded beginner lessons
```

## How to talk about this in interviews

1. **Agents vs tools vs workflows.** The supervisor is an LLM router. Pattern conversion is a deterministic workflow. Coaching is an agent with tools.
2. **When not to use a model.** Floss matching is perceptual color math. An LLM would hallucinate DMC codes.
3. **Human-in-the-loop.** PatternConverter `interrupt`s so you approve (or shrink) the palette before the graph continues.
4. **Grounding.** ClayCoach must `get_clay_lesson` — it is not allowed to invent cone numbers in v1.
5. **Full-stack contract.** FastAPI streams SSE; Next.js is a client with no model key.

Failure mode to mention: a noisy photo with 16 colors becomes muddy. Fix is fewer colors, more contrast, or a graphic source — not a smarter prompt.

## Learn as you read

1. `api/app/stitch/convert.py` — the product without any AI
2. `api/app/agents/tools.py` — wrapping code as tools
3. `api/app/agents/graph.py` — supervisor + specialists + interrupt
4. `api/app/main.py` — SSE to the UI
5. `web/app/stitch/page.tsx` — consuming the stream

## v2 ideas

Auth, PDF export, clay photo critique, more catalog briefs, evals on routing quality.
