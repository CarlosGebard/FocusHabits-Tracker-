from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PlaybackState(Base):
    __tablename__ = "playback_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    last_track_id: Mapped[int | None] = mapped_column(Integer)
    position_ms: Mapped[int | None] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    queue_json: Mapped[dict | None] = mapped_column(JSONB)
