from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

TRACE_PATH = Path(__file__).resolve().parents[2] / "data" / "traces.jsonl"


def log_trace(event: dict) -> None:
    TRACE_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {"ts": datetime.now(timezone.utc).isoformat(), **event}
    with TRACE_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload) + "\n")


def recent_traces(limit: int = 40) -> list[dict]:
    if not TRACE_PATH.exists():
        return []
    lines = TRACE_PATH.read_text(encoding="utf-8").splitlines()
    out = []
    for line in lines[-limit:]:
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out
