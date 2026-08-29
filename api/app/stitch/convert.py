from __future__ import annotations

import base64
import io
import math
from typing import Any

import numpy as np
from PIL import Image
from sklearn.cluster import KMeans

from app.stitch.color import ciede2000, rgb_to_lab
from app.stitch.difficulty import score_pattern
from app.stitch.dmc import dmc_labs, load_dmc

SYMBOLS = list("X+#*@%&ABCDEFGHJKLMNPQRSTUVWYZ23456789○■▲▼●□◆◇△")


def convert_image(
    image_bytes: bytes,
    stitch_width: int = 80,
    max_colors: int = 16,
    aida_count: int = 14,
) -> dict[str, Any]:
    stitch_width = int(max(16, min(160, stitch_width)))
    max_colors = int(max(4, min(60, max_colors)))
    aida_count = int(max(11, min(22, aida_count)))

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    src_w, src_h = image.size
    stitch_height = max(8, round(src_h / src_w * stitch_width))
    small = image.resize((stitch_width, stitch_height), Image.Resampling.LANCZOS)
    labs = rgb_to_lab(np.asarray(small, dtype=np.float64).reshape(-1, 3))

    unique = np.unique(np.asarray(small).reshape(-1, 3), axis=0)
    k = min(max_colors, len(unique), labs.shape[0])
    labels = KMeans(n_clusters=k, n_init=8, random_state=42).fit_predict(labs)
    centroids = np.vstack(
        [labs[labels == i].mean(axis=0) if np.any(labels == i) else labs[0] for i in range(k)]
    )

    floss = load_dmc()
    floss_labs = dmc_labs()
    distances = ciede2000(centroids, floss_labs)

    cluster_to_dmc: list[int] = []
    used: set[int] = set()
    for cluster in range(k):
        chosen = int(np.argmin(distances[cluster]))
        for idx in np.argsort(distances[cluster]):
            if int(idx) not in used:
                chosen = int(idx)
                break
        used.add(chosen)
        cluster_to_dmc.append(chosen)

    palette_labs = floss_labs[cluster_to_dmc]
    assigned = np.argmin(ciede2000(labs, palette_labs), axis=1)

    palette: list[dict[str, Any]] = []
    remap = np.full(k, -1, dtype=int)
    for i, dmc_index in enumerate(cluster_to_dmc):
        count = int((assigned == i).sum())
        if count == 0:
            continue
        remap[i] = len(palette)
        item = floss[dmc_index]
        palette.append(
            {
                "code": item["code"],
                "name": item["name"],
                "hex": item["hex"],
                "rgb": list(item["rgb"]),
                "symbol": SYMBOLS[len(palette) % len(SYMBOLS)],
                "count": count,
                "index": len(palette),
            }
        )

    mapped = remap[assigned].reshape(stitch_height, stitch_width)
    difficulty = score_pattern(mapped, palette, aida_count)

    preview = Image.fromarray(_preview_rgb(mapped, palette), mode="RGB")
    preview = preview.resize((stitch_width * 6, stitch_height * 6), Image.Resampling.NEAREST)
    buf = io.BytesIO()
    preview.save(buf, format="PNG")

    per_skein = 1900 if aida_count <= 14 else 1500
    skeins = [{**entry, "skeins": max(1, math.ceil(entry["count"] / per_skein))} for entry in palette]

    return {
        "width": stitch_width,
        "height": stitch_height,
        "aida_count": aida_count,
        "size_inches": [round(stitch_width / aida_count, 2), round(stitch_height / aida_count, 2)],
        "grid": mapped.tolist(),
        "palette": palette,
        "difficulty": difficulty,
        "preview_png_base64": base64.b64encode(buf.getvalue()).decode("ascii"),
        "skeins": skeins,
    }


def _preview_rgb(grid: np.ndarray, palette: list[dict]) -> np.ndarray:
    colors = np.array([entry["rgb"] for entry in palette], dtype=np.uint8)
    return colors[grid]
