from __future__ import annotations

from urllib.parse import quote_plus


def _find(query: str) -> str:
    return f"https://www.google.com/search?q={quote_plus(query + ' free cross stitch pattern')}"


CATALOG = [
    {
        "id": "olive-sprig",
        "title": "Olive sprig sampler",
        "hours": 8,
        "colors": 9,
        "level": "confident beginner",
        "techniques": ["full_cross", "backstitch"],
        "why": "Clean shapes, limited palette, a little backstitch for stems.",
        "url": _find("olive branch botanical sampler"),
    },
    {
        "id": "lunar-phases",
        "title": "Lunar phases strip",
        "hours": 12,
        "colors": 6,
        "level": "confident beginner",
        "techniques": ["full_cross"],
        "why": "Repeating circles teach consistency without a huge color count.",
        "url": _find("moon phases"),
    },
    {
        "id": "folk-moth",
        "title": "Folk moth",
        "hours": 18,
        "colors": 14,
        "level": "intermediate",
        "techniques": ["full_cross", "backstitch"],
        "why": "More color changes in the wings — a gentle confetti step-up.",
        "url": _find("folk moth"),
    },
    {
        "id": "geometric-tile",
        "title": "Geometric tile",
        "hours": 10,
        "colors": 8,
        "level": "intermediate",
        "techniques": ["full_cross", "fractional"],
        "why": "Harder because of precise counting, not because of 40 floss colors.",
        "url": _find("geometric blackwork tile"),
    },
    {
        "id": "tiny-still-life",
        "title": "Tiny citrus still life",
        "hours": 22,
        "colors": 18,
        "level": "intermediate",
        "techniques": ["full_cross", "blended_threads"],
        "why": "Blending on the fruit is the stretch technique.",
        "url": _find("citrus fruit still life"),
    },
    {
        "id": "house-portrait",
        "title": "Small house portrait",
        "hours": 30,
        "colors": 22,
        "level": "advanced",
        "techniques": ["full_cross", "backstitch", "fractional"],
        "why": "Architecture forces fractionals and patient counting.",
        "url": _find("small house portrait"),
    },
    {
        "id": "botanical-alphabet",
        "title": "Botanical alphabet block",
        "hours": 16,
        "colors": 12,
        "level": "intermediate",
        "techniques": ["full_cross", "backstitch"],
        "why": "Letterforms plus leaves: readable shapes with decorative extras.",
        "url": _find("botanical alphabet floral letter"),
    },
    {
        "id": "night-window",
        "title": "Night window",
        "hours": 26,
        "colors": 16,
        "level": "advanced",
        "techniques": ["full_cross", "blended_threads", "backstitch"],
        "why": "Dark values and tiny lights — blending without a huge palette.",
        "url": _find("night window city lights"),
    },
]


def search_catalog(
    max_hours: int | None = None,
    max_colors: int | None = None,
    known: list[str] | None = None,
) -> list[dict]:
    known = known or []
    results = []
    for item in CATALOG:
        if max_hours is not None and item["hours"] > max_hours + 8:
            continue
        if max_colors is not None and item["colors"] > max_colors + 6:
            continue
        missing = [t for t in item["techniques"] if t not in known]
        results.append({**item, "new_techniques": missing})
    results.sort(key=lambda row: (len(row["new_techniques"]), abs(row["hours"] - (max_hours or 15))))
    return results
