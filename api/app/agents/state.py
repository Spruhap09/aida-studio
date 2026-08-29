from __future__ import annotations

import json
from typing import Annotated, Any, TypedDict

from langgraph.graph.message import add_messages


class StudioState(TypedDict, total=False):
    messages: Annotated[list, add_messages]
    stitch_width: int
    max_colors: int
    aida_count: int
    last_pattern: dict[str, Any] | None
