from __future__ import annotations

from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.playback import PlaybackState
from app.models.playlist import Playlist, PlaylistItem
from app.models.track import Track
from app.schemas.playback import PlaybackStateIn, PlaybackStateOut
from app.schemas.playlist import (
    PlaylistCreate,
    PlaylistItemCreate,
    PlaylistManifest,
    PlaylistManifestTrack,
    PlaylistOut,
)
from app.schemas.track import TrackDetail, TrackOut
from app.services.scanner import scan_media
from app.utils.streaming import file_iterator, parse_range

from app.api.deps import get_current_user

public_router = APIRouter(prefix="/api")
protected_router = APIRouter(prefix="/api", dependencies=[Depends(get_current_user)])

# Health check endpoint
@public_router.get("/health")
def health() -> dict:
    return {"status": "ok", "time": datetime.now().isoformat()}

# Tracks endpoints
# Lista de canciones disponibles
@protected_router.get("/tracks", response_model=list[TrackOut])
def list_tracks(db: Session = Depends(get_db)):
    tracks = db.execute(select(Track).order_by(Track.id)).scalars().all()
    return tracks

# Escanea el directorio de medios y agrega nuevas canciones a la base de datos
@protected_router.post("/tracks/scan")
def scan_tracks(db: Session = Depends(get_db)):
    count = scan_media(db)
    return {"added": count}

# Info de una cancion por su ID
@protected_router.get("/tracks/{track_id}", response_model=TrackDetail)
def get_track(track_id: int, db: Session = Depends(get_db)):
    track = db.get(Track, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return track

# 
@protected_router.get("/tracks/{track_id}/stream")
def stream_track(track_id: int, request: Request, db: Session = Depends(get_db)):
    track = db.get(Track, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    full_path = Path(settings.media_root) / track.path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File missing")

    file_size = full_path.stat().st_size
    range_header = request.headers.get("range")
    parsed = parse_range(range_header, file_size)

    if parsed:
        headers = {
            "Content-Range": f"bytes {parsed.start}-{parsed.end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(parsed.length),
        }
        return StreamingResponse(
            file_iterator(str(full_path), parsed.start, parsed.length),
            status_code=206,
            headers=headers,
            media_type=track.mime,
        )

    return FileResponse(str(full_path), media_type=track.mime)


@protected_router.get("/tracks/{track_id}/download")
def download_track(track_id: int, db: Session = Depends(get_db)):
    track = db.get(Track, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    full_path = Path(settings.media_root) / track.path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File missing")
    return FileResponse(str(full_path), media_type=track.mime, filename=full_path.name)


@protected_router.get("/playlists", response_model=list[PlaylistOut])
def list_playlists(db: Session = Depends(get_db)):
    playlists = db.execute(select(Playlist).order_by(Playlist.id)).scalars().all()
    return playlists


@protected_router.post("/playlists", response_model=PlaylistOut)
def create_playlist(payload: PlaylistCreate, db: Session = Depends(get_db)):
    playlist = Playlist(name=payload.name, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return playlist


@protected_router.get("/playlists/{playlist_id}", response_model=PlaylistOut)
def get_playlist(playlist_id: int, db: Session = Depends(get_db)):
    playlist = db.get(Playlist, playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return playlist


@protected_router.post("/playlists/{playlist_id}/items", response_model=PlaylistOut)
def add_playlist_item(playlist_id: int, payload: PlaylistItemCreate, db: Session = Depends(get_db)):
    playlist = db.get(Playlist, playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    track = db.get(Track, payload.track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    item = PlaylistItem(playlist_id=playlist.id, track_id=track.id, position=payload.position)
    db.add(item)
    playlist.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(playlist)
    return playlist


@protected_router.delete("/playlists/{playlist_id}/items/{item_id}")
def delete_playlist_item(playlist_id: int, item_id: int, db: Session = Depends(get_db)):
    item = db.get(PlaylistItem, item_id)
    if not item or item.playlist_id != playlist_id:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    playlist = db.get(Playlist, playlist_id)
    if playlist:
        playlist.updated_at = datetime.utcnow()
    db.commit()
    return {"deleted": True}


@protected_router.get("/playlists/{playlist_id}/manifest", response_model=PlaylistManifest)
def playlist_manifest(playlist_id: int, db: Session = Depends(get_db)):
    playlist = db.get(Playlist, playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    tracks = []
    for item in playlist.items:
        track = item.track
        tracks.append(
            PlaylistManifestTrack(
                id=track.id,
                title=track.title,
                artist=track.artist,
                album=track.album,
                duration_ms=track.duration_ms,
                mime=track.mime,
                sha256=track.sha256,
                size_bytes=track.size_bytes,
                download_url=f"{settings.base_url}/api/tracks/{track.id}/download",
            )
        )

    return PlaylistManifest(
        playlist_id=playlist.id,
        name=playlist.name,
        updated_at=playlist.updated_at,
        tracks=tracks,
    )


@protected_router.post("/sync/playback", response_model=PlaybackStateOut)
def sync_playback(payload: PlaybackStateIn, db: Session = Depends(get_db)):
    state = db.get(PlaybackState, 1)
    data = {
        "last_track_id": payload.last_track_id,
        "position_ms": payload.position_ms,
        "queue": payload.queue,
        "shuffle": payload.shuffle,
        "repeat": payload.repeat,
    }
    if not state:
        state = PlaybackState(id=1)
        db.add(state)
    state.last_track_id = payload.last_track_id
    state.position_ms = payload.position_ms
    state.queue_json = data
    state.updated_at = datetime.utcnow()
    db.commit()
    return PlaybackStateOut(**data)
