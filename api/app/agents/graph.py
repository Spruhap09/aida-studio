"""Supervisor + four specialist agents.

The supervisor only routes. Specialists call tools. Color math never goes through the LLM.
"""

from __future__ import annotations

import json
import re
from typing import Literal

from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import create_react_agent
from langgraph.types import Command, interrupt
from pydantic import BaseModel, Field

from app.agents.session import get_upload, remember_pattern
from app.agents.llm import get_llm
from app.agents.state import StudioState
from app.agents.tools import (
    explain_technique,
    get_clay_lesson,
    read_skill_profile,
    recommend_patterns,
    update_skill_profile,
)
from app.stitch.convert import convert_image

memory = MemorySaver()
_graph = None


class RouteDecision(BaseModel):
    agent: Literal["pattern_converter", "stitch_coach", "recommender", "clay_coach"]
    rationale: str = Field(description="One sentence on why this specialist should answer.")


SUPERVISOR_PROMPT = """You route requests for Aida, a studio for cross-stitch and beginner clay.

Pick one specialist:
- pattern_converter: user uploaded a photo or wants a chart / DMC palette / stitch count
- stitch_coach: difficulty, techniques, how to level up, reading a pattern
- recommender: "what should I stitch next", catalog ideas, project suggestions
- clay_coach: pinch pots, coils, slabs, drying, wedging, beginner clay troubleshooting

If the message mixes topics, pick the primary intent. Cross-stitch is the default if unclear.

Reply with JSON only, no markdown:
{"agent": "recommender", "rationale": "one sentence"}
agent must be one of: pattern_converter, stitch_coach, recommender, clay_coach
"""

CONVERTER_PROMPT = """You are PatternConverter. You turn photos into cross-stitch charts.
Call convert_uploaded_image when an image is available. Explain palette size vs detail in plain language.
Never invent DMC codes — only use tool output. After a conversion, summarize difficulty and the shopping list.
If no image is uploaded, ask for one and suggest stitch width (80), colors (12–20), and Aida (14).
"""

COACH_PROMPT = """You are StitchCoach for someone who already cross-stitches and wants harder patterns.
Use read_skill_profile, explain_technique, and update_skill_profile.
Push a stretch of about +20% effort or one new technique — not a leap to 50-color confetti.
Be specific and practical. No fluff.
"""

REC_PROMPT = """You are Recommender. Call recommend_patterns and explain why the top 2–3 fit.
Each catalog item includes a url. Always show it as a markdown link like [Find similar free patterns](url) so the stitcher can click it.
These briefs are original ideas, not licensed charts. The link searches for similar free patterns.
"""

CLAY_PROMPT = """You are ClayCoach for someone who has never touched clay.
Call get_clay_lesson before giving process advice.
Talk like a patient friend at the kitchen table: short sentences, numbered steps, no studio slang unless you define it in the same breath (e.g. "slip — that's just clay mixed with water").
Prefer everyday words: knead, scratch, paste, snake, bag, pinky-thick. Say "small bowl" not "pinch pot", "clay snakes" not "coils", "clay-water paste" not "slip" unless you define the studio word in the same breath.
These how-tos are for air-dry clay that hardens on a shelf. Do not invent kiln temperatures, cone numbers, or glaze recipes. If asked about firing, say this studio only covers making and air-drying by hand.
Offer one next thing to try.
"""


def converter_node(state: StudioState, config: RunnableConfig) -> dict:
    """Deterministic convert + human approval. The LLM is not asked to pick floss."""
    thread_id = (config.get("configurable") or {}).get("thread_id")
    image = get_upload(thread_id)
    if image is None:
        return {
            "messages": [
                AIMessage(
                    content="Upload a photo and I will turn it into a DMC chart. Try 80 stitches wide, 12–16 colors, 14-count Aida to start."
                )
            ]
        }

    width = int(state.get("stitch_width") or 80)
    colors = int(state.get("max_colors") or 16)
    aida = int(state.get("aida_count") or 14)
    pattern = convert_image(image, width, colors, aida)
    remember_pattern(pattern, thread_id)

    decision = interrupt(
        {
            "type": "palette_approval",
            "palette": pattern["palette"],
            "difficulty": pattern["difficulty"],
            "preview_png_base64": pattern["preview_png_base64"],
            "width": pattern["width"],
            "height": pattern["height"],
            "aida_count": aida,
            "size_inches": pattern["size_inches"],
        }
    )

    new_colors = colors
    if isinstance(decision, dict):
        if decision.get("max_colors"):
            new_colors = int(decision["max_colors"])
        if decision.get("approved") is False:
            return {"messages": [AIMessage(content="Okay — I kept the preview. Change the color count and we can convert again.")]}

    if new_colors != colors:
        pattern = convert_image(image, width, new_colors, aida)
        remember_pattern(pattern, thread_id)

    summary = (
        f"Chart is {pattern['width']}×{pattern['height']} on {aida}-count "
        f"({pattern['size_inches'][0]}×{pattern['size_inches'][1]} in). "
        f"{len(pattern['palette'])} DMC colors, difficulty {pattern['difficulty']['level']} "
        f"({pattern['difficulty']['score']}/100), about {pattern['difficulty']['estimated_hours']} hours. "
        "Shopping list is in the legend. Screen-to-thread matching is approximate — check a real shade card for critical colors."
    )
    return {"messages": [AIMessage(content=summary)], "last_pattern": pattern}


def _parse_route(text: str) -> RouteDecision:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE).strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start >= 0 and end > start:
        cleaned = cleaned[start : end + 1]
    try:
        return RouteDecision.model_validate(json.loads(cleaned))
    except (json.JSONDecodeError, ValueError):
        return RouteDecision(agent="stitch_coach", rationale="Could not parse route; defaulting to stitch coach.")


def supervisor_node(state: StudioState) -> Command:
    raw = get_llm(streaming=False).invoke(
        [
            SystemMessage(content=SUPERVISOR_PROMPT),
            *state["messages"][-8:],
        ]
    )
    text = raw.content if isinstance(raw.content, str) else str(raw.content)
    return Command(goto=_parse_route(text).agent)


def build_graph():
    llm = get_llm()
    coach = create_react_agent(
        llm,
        tools=[read_skill_profile, update_skill_profile, explain_technique],
        prompt=COACH_PROMPT,
        name="stitch_coach",
    )
    recs = create_react_agent(
        llm,
        tools=[recommend_patterns, read_skill_profile],
        prompt=REC_PROMPT,
        name="recommender",
    )
    clay = create_react_agent(
        llm,
        tools=[get_clay_lesson],
        prompt=CLAY_PROMPT,
        name="clay_coach",
    )

    graph = StateGraph(StudioState)
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("pattern_converter", converter_node)
    graph.add_node("stitch_coach", coach)
    graph.add_node("recommender", recs)
    graph.add_node("clay_coach", clay)
    graph.add_edge(START, "supervisor")
    graph.add_edge("pattern_converter", END)
    graph.add_edge("stitch_coach", END)
    graph.add_edge("recommender", END)
    graph.add_edge("clay_coach", END)
    return graph.compile(checkpointer=memory)


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


def reset_graph() -> None:
    global _graph
    _graph = None
