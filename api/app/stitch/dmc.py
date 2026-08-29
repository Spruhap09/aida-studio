from __future__ import annotations

import csv
from functools import lru_cache
from pathlib import Path

import numpy as np

from app.stitch.color import hex_to_rgb, rgb_to_lab

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "dmc.csv"


@lru_cache(maxsize=1)
def load_dmc() -> list[dict]:
    rows: list[dict] = []
    seen: set[str] = set()
    with DATA_PATH.open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        header = next(reader, None)
        if header is None:
            raise RuntimeError(f"Empty DMC palette at {DATA_PATH}")
        for raw in reader:
            if len(raw) < 3:
                continue
            code, name, hex_code = (part.strip() for part in raw[:3])
            code = code.replace(" ", "")
            if not hex_code.startswith("#") or code in seen:
                continue
            r, g, b = hex_to_rgb(hex_code)
            seen.add(code)
            rows.append(
                {
                    "code": code,
                    "name": name,
                    "hex": hex_code.lower(),
                    "rgb": (r, g, b),
                }
            )
    if len(rows) < 50:
        raise RuntimeError("DMC palette looks incomplete")
    return rows


@lru_cache(maxsize=1)
def dmc_labs() -> np.ndarray:
    rgbs = np.array([row["rgb"] for row in load_dmc()], dtype=np.float64)
    return rgb_to_lab(rgbs)
