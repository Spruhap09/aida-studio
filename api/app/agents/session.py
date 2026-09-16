"""Request-scoped blobs. ContextVars break under Starlette's SSE task group."""

from __future__ import annotations

UPLOADS: dict[str, bytes] = {}
PATTERNS: dict[str, dict] = {}


def set_upload(thread_id: str, data: bytes | None) -> None:
    if data:
        UPLOADS[thread_id] = data
    else:
        UPLOADS.pop(thread_id, None)


def get_upload(thread_id: str | None = None) -> bytes | None:
    if thread_id and thread_id in UPLOADS:
        return UPLOADS[thread_id]
    if len(UPLOADS) == 1:
        return next(iter(UPLOADS.values()))
    return None


def remember_pattern(pattern: dict | None, thread_id: str | None = None) -> None:
    if pattern is None:
        return
    PATTERNS["_latest"] = pattern
    if thread_id:
        PATTERNS[thread_id] = pattern
    elif len(UPLOADS) == 1:
        PATTERNS[next(iter(UPLOADS))] = pattern


def get_pattern(thread_id: str | None) -> dict | None:
    if thread_id and thread_id in PATTERNS:
        return PATTERNS[thread_id]
    return PATTERNS.get("_latest")


def clear_session(thread_id: str) -> None:
    UPLOADS.pop(thread_id, None)
    PATTERNS.pop(thread_id, None)
