from __future__ import annotations

import json
from contextvars import ContextVar

from langchain_core.tools import tool

from app.clay.lessons import get_lesson
from app.db import get_profile, save_profile
from app.stitch.catalog import search_catalog
from app.stitch.convert import convert_image

current_image: ContextVar[bytes | None] = ContextVar("current_image", default=None)
last_pattern_out: ContextVar[dict | None] = ContextVar("last_pattern_out", default=None)

TECHNIQUES = {
    "full_cross": "The basic X. Keep / and \\ tension even so the top stitch always leans the same way.",
    "backstitch": "Outlines and text. Usually 1–2 strands. Do it after the full crosses so lines sit cleanly on top.",
    "fractional": "Quarter and three-quarter stitches for curves. Harder counting, not more colors.",
    "blended_threads": "One strand of color A + one of B in the needle. Softens transitions without extra confetti.",
    "french_knot": "Decorative dots. Wrap twice for a stitcher who already has even tension.",
}


@tool
def convert_uploaded_image(stitch_width: int = 80, max_colors: int = 16, aida_count: int = 14) -> str:
    """Convert the photo the user uploaded into a cross-stitch pattern with DMC floss."""
    image = current_image.get()
    if not image:
        return json.dumps({"error": "No image uploaded. Ask the user to attach a photo."})
    pattern = convert_image(image, stitch_width, max_colors, aida_count)
    slim = {
        "width": pattern["width"],
        "height": pattern["height"],
        "aida_count": pattern["aida_count"],
        "size_inches": pattern["size_inches"],
        "difficulty": pattern["difficulty"],
        "palette": [
            {"code": p["code"], "name": p["name"], "hex": p["hex"], "count": p["count"], "symbol": p["symbol"]}
            for p in pattern["palette"]
        ],
        "preview_png_base64": pattern["preview_png_base64"],
        "grid": pattern["grid"],
        "skeins": [{"code": s["code"], "name": s["name"], "skeins": s["skeins"], "count": s["count"]} for s in pattern["skeins"]],
    }
    return json.dumps(slim)


@tool
def read_skill_profile() -> str:
    """Read the stitcher's saved skill profile."""
    return json.dumps(get_profile())


@tool
def update_skill_profile(
    experience: str | None = None,
    max_colors_comfortable: int | None = None,
    preferred_hours: int | None = None,
    known_techniques: list[str] | None = None,
    goals: str | None = None,
) -> str:
    """Update the stitcher's skill profile after you learn something new about them."""
    current = get_profile()
    if experience:
        current["experience"] = experience
    if max_colors_comfortable is not None:
        current["max_colors_comfortable"] = max_colors_comfortable
    if preferred_hours is not None:
        current["preferred_hours"] = preferred_hours
    if known_techniques is not None:
        current["known_techniques"] = known_techniques
    if goals:
        current["goals"] = goals
    return json.dumps(save_profile(current))


@tool
def explain_technique(technique: str) -> str:
    """Explain a cross-stitch technique. One of: full_cross, backstitch, fractional, blended_threads, french_knot."""
    key = technique.strip().lower().replace(" ", "_")
    if key not in TECHNIQUES:
        return json.dumps({"error": "Unknown technique", "known": list(TECHNIQUES)})
    return json.dumps({"technique": key, "explanation": TECHNIQUES[key]})


@tool
def recommend_patterns() -> str:
    """Recommend catalog patterns that stretch the stitcher's current skill without jumping too far."""
    profile = get_profile()
    results = search_catalog(
        max_hours=int(profile.get("preferred_hours") or 15),
        max_colors=int(profile.get("max_colors_comfortable") or 20),
        known=list(profile.get("known_techniques") or []),
    )
    return json.dumps(results[:5])


@tool
def get_clay_lesson(topic: str = "") -> str:
    """Fetch a beginner clay lesson. Topics: pinch, coil, slab, drying, wedging, joining, failures."""
    lesson = get_lesson(topic=topic or None)
    return json.dumps(lesson)
