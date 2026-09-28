from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class LlmNotConfigured(RuntimeError):
    pass


@lru_cache(maxsize=2)
def get_llm(streaming: bool = True):
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if openai_key:
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            temperature=0.35,
            api_key=openai_key,
            disable_streaming=not streaming,
        )
    if anthropic_key:
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(
            model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-latest"),
            temperature=0.35,
            api_key=anthropic_key,
            disable_streaming=not streaming,
        )
    raise LlmNotConfigured(
        "No LLM key set. Add OPENAI_API_KEY on the API host to talk to the agents."
    )


CHAT_LIMIT_MESSAGE = (
    "Chat is paused because this demo hit its OpenAI usage limit. "
    "Photo convert and clay lessons still work. Try again later."
)
CHAT_RATE_MESSAGE = (
    "Chat is temporarily rate-limited. Wait a minute and send again. "
    "Photo convert still works."
)


def public_chat_error(exc: BaseException) -> str:
    if isinstance(exc, LlmNotConfigured):
        return str(exc)
    blob = " ".join(
        [
            type(exc).__name__,
            str(exc),
            str(getattr(exc, "code", "") or ""),
            str(getattr(exc, "status_code", "") or ""),
            str(getattr(exc, "type", "") or ""),
        ]
    ).lower()
    if any(
        marker in blob
        for marker in (
            "insufficient_quota",
            "exceeded your current quota",
            "billing_not_active",
            "monthly budget",
            "usage limit",
            "budget exceeded",
            "spending limit",
        )
    ):
        return CHAT_LIMIT_MESSAGE
    if any(
        marker in blob
        for marker in ("ratelimit", "rate_limit", "rate limit", "too many requests", " 429", "error code: 429")
    ):
        return CHAT_RATE_MESSAGE
    return "Chat failed just now. Photo convert and clay lessons still work. Try again in a moment."


def llm_ready() -> bool:
    try:
        get_llm()
        return True
    except LlmNotConfigured:
        return False
