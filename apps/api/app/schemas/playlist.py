from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.track import TrackOut


class PlaylistItemOut(BaseModel):
    id: int
    position: int
    track: TrackOut


class PlaylistOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime
    items: list[PlaylistItemOut] = []


class PlaylistCreate(BaseModel):
    name: str


class PlaylistItemCreate(BaseModel):
    track_id: int
    position: int


class PlaylistManifestTrack(BaseModel):
    id: int
    title: str
    artist: str | None = None
    album: str | None = None
    duration_ms: int | None = None
    mime: str
    sha256: str
    size_bytes: int
    download_url: str


class PlaylistManifest(BaseModel):
    playlist_id: int
    name: str
    updated_at: datetime
    tracks: list[PlaylistManifestTrack]
