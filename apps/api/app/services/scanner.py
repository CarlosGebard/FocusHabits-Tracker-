from __future__ import annotations

import hashlib
import mimetypes
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.track import Track

try:
    from mutagen._file import File as MutagenFile 
except Exception:  # pragma: no cover - optional dependency
    MutagenFile = None

# Utils para escanear archivos de audio y agregarlos a la base de datos

SUPPORTED_EXT = {".mp3", ".m4a", ".opus"}

# Consigue la metadata de un archivo de audio
def _guess_metadata(path: Path) -> tuple[str, str | None, str | None, int | None]:
    title = path.stem
    artist = None
    album = None
    duration_ms = None
    # Si mutagen esta disponible, intenta abrir el archivo y extraer tags
    if MutagenFile:
        audio = MutagenFile(str(path))
        if audio is not None:
            title = (audio.tags.get("TIT2") or [title])[0] if hasattr(audio, "tags") and audio.tags else title
            artist = (audio.tags.get("TPE1") or [artist])[0] if hasattr(audio, "tags") and audio.tags else artist
            album = (audio.tags.get("TALB") or [album])[0] if hasattr(audio, "tags") and audio.tags else album
            if audio.info:
                duration_ms = int(audio.info.length * 1000)

    return title, artist, album, duration_ms

# Calcula el hash sha256 de un archivo, para detectar duplicados
def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

# Escanea la ruta de musica en busca de nuevos archivos y los agrega a la base de datos
def scan_media(db: Session) -> int:
    media_root = Path(settings.media_root)
    # Si la carpeta no existe, no hay nada que escanear
    if not media_root.exists():
        return 0
    # Recorre recursivamente todos los archivos en la carpeta de musica
    count = 0
    for file_path in media_root.rglob("*"):
        if file_path.suffix.lower() not in SUPPORTED_EXT:
            continue
        # Verifica si el archivo ya existe en la base de datos
        rel_path = str(file_path.relative_to(media_root))
        existing = db.execute(select(Track).where(Track.path == rel_path)).scalar_one_or_none()
        if existing:
            continue
        # Extrae metadata y agrega el nuevo track a la base de datos
        title, artist, album, duration_ms = _guess_metadata(file_path)
        sha256 = _sha256(file_path)
        size_bytes = file_path.stat().st_size
        mime = mimetypes.guess_type(file_path.name)[0]
        if not mime and file_path.suffix.lower() == ".opus":
            mime = "audio/opus"
        mime = mime or "application/octet-stream"

        track = Track(
            title=title,
            artist=artist,
            album=album,
            duration_ms=duration_ms,
            mime=mime,
            path=rel_path,
            sha256=sha256,
            size_bytes=size_bytes,
        )
        db.add(track)
        count += 1

    db.commit()
    return count
