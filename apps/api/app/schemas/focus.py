from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class FocusStartIn(BaseModel):
    duration_seconds: int = Field(..., ge=300, le=7200)


class FocusSessionOut(BaseModel):
  id: int
  user_id: int
  duration_seconds: int
  started_at: datetime
  ended_at: datetime | None
  status: str
  paused_seconds: int
  paused_at: datetime | None


class FocusSessionsOut(BaseModel):
    items: list[FocusSessionOut]
    total: int
