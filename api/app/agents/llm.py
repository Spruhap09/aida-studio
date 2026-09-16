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
        "No LLM key set. Add OPENAI_API_KEY or ANTHROPIC_API_KEY to api/.env to talk to the agents."
    )


def llm_ready() -> bool:
    try:
        get_llm()
        return True
    except LlmNotConfigured:
        return False
