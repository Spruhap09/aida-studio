from __future__ import annotations

import math


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def score_pattern(grid, palette: list[dict], aida_count: int) -> dict:
    """Transparent difficulty — not an LLM guess. Easy to defend in an interview."""
    import numpy as np

    height, width = grid.shape
    stitches = int(grid.size)
    color_count = len(palette)

    padded = np.pad(grid, 1, mode="edge")
    center = padded[1:-1, 1:-1]
    neighbors = [
        padded[0:-2, 1:-1],
        padded[2:, 1:-1],
        padded[1:-1, 0:-2],
        padded[1:-1, 2:],
    ]
    different = np.zeros_like(center, dtype=bool)
    for neighbor in neighbors:
        different |= neighbor != center
    confetti = float(different.mean())

    color_term = _clamp01((color_count - 6) / 34)
    size_term = _clamp01((stitches - 1500) / 35000)
    confetti_term = _clamp01((confetti - 0.15) / 0.7)
    score = 100 * (0.28 * color_term + 0.27 * size_term + 0.45 * confetti_term)

    if score < 28:
        level = "beginner"
    elif score < 48:
        level = "confident beginner"
    elif score < 68:
        level = "intermediate"
    elif score < 84:
        level = "advanced"
    else:
        level = "expert"

    stitches_per_hour = 220 if aida_count <= 14 else 180
    hours = max(1.0, round(stitches / stitches_per_hour, 1))

    stretch = []
    if color_count < 18:
        stretch.append("Try a palette with 4–6 more colors on your next piece.")
    if confetti < 0.35:
        stretch.append("Look for a pattern with more isolated stitches (confetti) to train color changes.")
    if stitches < 8000:
        stretch.append("Step up stitch count by about 20% rather than doubling size.")
    if not stretch:
        stretch.append("Add one new technique: blended threads, fractional stitches, or detailed backstitch.")

    return {
        "score": round(score, 1),
        "level": level,
        "estimated_hours": hours,
        "factors": {
            "color_count": color_count,
            "stitches": stitches,
            "width": int(width),
            "height": int(height),
            "confetti": round(confetti, 3),
            "aida_count": aida_count,
        },
        "stretch_goals": stretch,
    }
