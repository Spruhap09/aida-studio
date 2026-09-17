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
        hits = [lesson for lesson in lessons if needle in _haystack(lesson)]
        return hits or lessons
    return lessons


def _haystack(lesson: dict) -> str:
    terms = " ".join(f"{t.get('word', '')} {t.get('meaning', '')}" for t in lesson.get("terms", []))
    return " ".join(
        [
            lesson.get("id", ""),
            lesson.get("title", ""),
            lesson.get("body", ""),
            lesson.get("plain", ""),
            lesson.get("why", ""),
            lesson.get("doneWhen", ""),
            lesson.get("ask", ""),
            " ".join(lesson.get("steps", [])),
            terms,
        ]
    ).lower()
