from __future__ import annotations

import json
from pathlib import Path

LESSON_PATH = Path(__file__).with_name("lessons.json")


def load_lessons() -> list[dict]:
    return json.loads(LESSON_PATH.read_text(encoding="utf-8"))


def get_lesson(lesson_id: str | None = None, topic: str | None = None) -> dict | list[dict]:
    lessons = load_lessons()
    if lesson_id:
        for lesson in lessons:
            if lesson["id"] == lesson_id:
                return lesson
    if topic:
        needle = topic.lower()
        hits = [lesson for lesson in lessons if needle in lesson["title"].lower() or needle in lesson["body"].lower()]
        return hits or lessons
    return lessons
