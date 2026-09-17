from __future__ import annotations

import json
import os
import uuid
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage, ToolMessage
from langgraph.types import Command
from pydantic import BaseModel

from app.agents.graph import get_graph
from app.agents.llm import LlmNotConfigured, llm_ready
from app.agents.session import clear_session, get_pattern, set_upload
from app.agents.traces import log_trace, recent_traces
from app.clay.lessons import load_lessons
from app.db import get_profile, init_db, save_profile
from app.stitch.catalog import CATALOG
from app.stitch.convert import convert_image
from app.stitch.dmc import load_dmc

load_dotenv()

def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    origins = [item.strip() for item in raw.split(",") if item.strip()]
    for local in ("http://localhost:3000", "http://127.0.0.1:3000"):
        if local not in origins:
            origins.append(local)
    return origins


app = FastAPI(title="Aida API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()
    load_dmc()


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None
    image_base64: str | None = None
    stitch_width: int = 80
    max_colors: int = 16
    aida_count: int = 14


class ResumeRequest(BaseModel):
    thread_id: str
    approved: bool = True
    max_colors: int | None = None


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    experience: str | None = None
    known_techniques: list[str] | None = None
    max_colors_comfortable: int | None = None
    preferred_hours: int | None = None
    goals: str | None = None


@app.get("/health")
def health() -> dict:
    return {"ok": True, "agents": llm_ready(), "floss_colors": len(load_dmc())}


@app.get("/catalog")
def catalog() -> list[dict]:
    return CATALOG


@app.get("/clay/lessons")
def clay_lessons() -> list[dict]:
    return load_lessons()


@app.get("/profile")
def profile() -> dict:
    return get_profile()


@app.put("/profile")
def update_profile(body: ProfileUpdate) -> dict:
    current = get_profile()
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    return save_profile({**current, **patch})


@app.get("/traces")
def traces() -> list[dict]:
    return recent_traces()


@app.post("/pattern/convert")
async def pattern_convert(
    image: UploadFile = File(...),
    stitch_width: int = Form(80),
    max_colors: int = Form(16),
    aida_count: int = Form(14),
) -> dict:
    data = await image.read()
    if not data:
        raise HTTPException(400, "Empty image")
    try:
        pattern = convert_image(data, stitch_width, max_colors, aida_count)
    except Exception as exc:
        raise HTTPException(400, f"Could not convert image: {exc}") from exc
    log_trace(
        {
            "kind": "convert",
            "width": pattern["width"],
            "height": pattern["height"],
            "colors": len(pattern["palette"]),
            "score": pattern["difficulty"]["score"],
        }
    )
    return pattern


@app.post("/studio/chat")
async def studio_chat(body: ChatRequest):
    if not llm_ready():
        raise HTTPException(
            503,
            "Add OPENAI_API_KEY or ANTHROPIC_API_KEY to api/.env to talk with the agents. Image conversion still works without a key.",
        )

    thread_id = body.thread_id or str(uuid.uuid4())
    image_bytes = _decode_image(body.image_base64)
    set_upload(thread_id, image_bytes)

    async def events():
        keep_upload = False
        try:
            yield _sse({"type": "thread", "thread_id": thread_id})
            graph = get_graph()
            config = {"configurable": {"thread_id": thread_id}}
            payload = {
                "messages": [HumanMessage(content=body.message)],
                "stitch_width": body.stitch_width,
                "max_colors": body.max_colors,
                "aida_count": body.aida_count,
            }
            async for item in graph.astream(payload, config, stream_mode=["updates", "messages"]):
                async for line in _handle_stream_item(item):
                    yield line
            state = await graph.aget_state(config)
            interrupt_payload = _interrupt_from_state(state)
            if interrupt_payload:
                keep_upload = True
                yield _sse(_interrupt_event(interrupt_payload))
            pattern = get_pattern(thread_id)
            if pattern:
                yield _sse({"type": "pattern", "pattern": pattern})
            yield _sse({"type": "done", "thread_id": thread_id})
        except LlmNotConfigured as exc:
            yield _sse({"type": "error", "message": str(exc)})
        except Exception as exc:
            log_trace({"kind": "error", "message": str(exc)})
            yield _sse({"type": "error", "message": str(exc)})
        finally:
            if not keep_upload:
                clear_session(thread_id)

    return StreamingResponse(events(), media_type="text/event-stream")


@app.post("/studio/resume")
async def studio_resume(body: ResumeRequest):
    if not llm_ready():
        raise HTTPException(503, "LLM key required")

    async def events():
        graph = get_graph()
        config = {"configurable": {"thread_id": body.thread_id}}
        resume = {"approved": body.approved, "max_colors": body.max_colors}
        try:
            async for item in graph.astream(Command(resume=resume), config, stream_mode=["updates", "messages"]):
                async for line in _handle_stream_item(item):
                    yield line
            pattern = get_pattern(body.thread_id)
            if pattern:
                yield _sse({"type": "pattern", "pattern": pattern})
            yield _sse({"type": "done", "thread_id": body.thread_id})
        except Exception as exc:
            log_trace({"kind": "error", "message": str(exc)})
            yield _sse({"type": "error", "message": str(exc)})
        finally:
            clear_session(body.thread_id)

    return StreamingResponse(events(), media_type="text/event-stream")


_HIDDEN_NODES = {"supervisor", "tools", "tool"}


def _plain_text(message: Any) -> str | None:
    content = getattr(message, "content", None)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text") or ""))
        joined = "".join(parts).strip()
        return joined or None
    return None


def _is_internal_text(text: str) -> bool:
    stripped = text.strip()
    if not stripped.startswith("{"):
        return False
    return any(
        marker in stripped
        for marker in (
            '"rationale"',
            '"display_name"',
            '"known_techniques"',
            '"technique"',
            '"explanation"',
            '"preview_png_base64"',
            '"new_techniques"',
        )
    )


async def _handle_stream_item(item: Any):
    mode, data = item if isinstance(item, tuple) and len(item) == 2 else ("updates", item)
    if mode == "messages":
        message, metadata = data if isinstance(data, tuple) else (data, {})
        node = (metadata or {}).get("langgraph_node", "agent")
        if node in _HIDDEN_NODES:
            return
        if isinstance(message, ToolMessage) or getattr(message, "type", None) == "tool":
            return
        if not isinstance(message, (AIMessage, AIMessageChunk)):
            return
        text = _plain_text(message)
        if not text or _is_internal_text(text):
            return
        yield _sse({"type": "token", "text": text, "agent": node})
        return
    if isinstance(data, dict):
        if "__interrupt__" in data:
            interrupt = data["__interrupt__"]
            value = interrupt[0].value if interrupt else {}
            if isinstance(value, dict):
                yield _sse(_interrupt_event(value))
            return
        for node, update in data.items():
            if node.startswith("__") or node in _HIDDEN_NODES:
                continue
            log_trace({"kind": "node", "agent": node})
            yield _sse({"type": "agent", "name": node})
            if isinstance(update, dict) and update.get("last_pattern"):
                yield _sse({"type": "pattern", "pattern": update["last_pattern"]})


def _interrupt_event(payload: dict) -> dict:
    kind = payload.get("type")
    rest = {k: v for k, v in payload.items() if k != "type"}
    return {"type": "interrupt", "interrupt_type": kind, **rest}


def _interrupt_from_state(state) -> dict | None:
    interrupts = getattr(state, "interrupts", None) or ()
    if not interrupts:
        tasks = getattr(state, "tasks", None) or ()
        for task in tasks:
            task_interrupts = getattr(task, "interrupts", None) or ()
            if task_interrupts:
                interrupts = task_interrupts
                break
    if not interrupts:
        return None
    first = interrupts[0]
    value = getattr(first, "value", first)
    return value if isinstance(value, dict) else {"payload": value}


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _decode_image(raw: str | None) -> bytes | None:
    if not raw:
        return None
    import base64

    if "," in raw:
        raw = raw.split(",", 1)[1]
    return base64.b64decode(raw)
