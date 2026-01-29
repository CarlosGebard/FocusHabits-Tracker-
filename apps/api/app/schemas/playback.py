from __future__ import annotations

from pydantic import BaseModel


class PlaybackStateIn(BaseModel):
    last_track_id: int | None = None
    position_ms: int | None = None
    queue: list[int] | None = None
    shuffle: bool | None = None
    repeat: str | None = None


class PlaybackStateOut(BaseModel):
    last_track_id: int | None = None
    position_ms: int | None = None
    queue: list[int] | None = None
    shuffle: bool | None = None
    repeat: str | None = None
