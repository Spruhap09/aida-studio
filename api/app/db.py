from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy import DateTime, Integer, String, Text, create_engine, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "aida.db"

engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


class SkillProfile(Base):
    __tablename__ = "skill_profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    payload: Mapped[str] = mapped_column(Text)


class SavedPattern(Base):
    __tablename__ = "saved_patterns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    payload: Mapped[str] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


DEFAULT_PROFILE = {
    "display_name": "Maker",
    "experience": "intermediate",
    "known_techniques": ["full_cross", "backstitch"],
    "max_colors_comfortable": 20,
    "preferred_hours": 15,
    "goals": "Learn harder patterns without jumping straight to 50-color confetti pieces.",
}


def init_db() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        if session.get(SkillProfile, 1) is None:
            session.add(SkillProfile(id=1, payload=json.dumps(DEFAULT_PROFILE)))
            session.commit()


def get_profile() -> dict:
    with SessionLocal() as session:
        row = session.get(SkillProfile, 1)
        if row is None:
            return DEFAULT_PROFILE
        return json.loads(row.payload)


def save_profile(profile: dict) -> dict:
    merged = {**DEFAULT_PROFILE, **profile}
    with SessionLocal() as session:
        row = session.get(SkillProfile, 1)
        if row is None:
            session.add(SkillProfile(id=1, payload=json.dumps(merged)))
        else:
            row.payload = json.dumps(merged)
        session.commit()
    return merged
