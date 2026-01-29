from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class TrackBase(BaseModel):
    title: str
    artist: str | None = None
    album: str | None = None
    duration_ms: int | None = None
    mime: str
    size_bytes: int


class TrackOut(TrackBase):
    id: int
    sha256: str
    created_at: datetime


class TrackDetail(TrackOut):
    path: str
