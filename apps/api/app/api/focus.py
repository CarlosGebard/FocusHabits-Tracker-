from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_401_UNAUTHORIZED, HTTP_409_CONFLICT

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.focus import FocusSession
from app.models.user import User
from app.schemas.focus import FocusSessionOut, FocusSessionsOut, FocusStartIn

router = APIRouter(prefix="/api/focus", tags=["focus"], dependencies=[Depends(get_current_user)])

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

def _elapsed_seconds(session: FocusSession, now: datetime) -> int:
    started = session.started_at
    effective_now = now
    if session.status == "paused" and session.paused_at:
        effective_now = session.paused_at
    paused_seconds = session.paused_seconds or 0
    elapsed = int((effective_now - started).total_seconds()) - paused_seconds
    return max(0, elapsed)


def _is_expired(session: FocusSession, now: datetime) -> bool:
    return _elapsed_seconds(session, now) >= session.duration_seconds


def _complete_expired_session(db: Session, session: FocusSession, now: datetime) -> bool:
    if session.status in {"completed", "canceled"}:
        return False
    if not _is_expired(session, now):
        return False
    if session.paused_at:
        delta = now - session.paused_at
        session.paused_seconds += int(delta.total_seconds())
        session.paused_at = None
    session.status = "completed"
    session.ended_at = now
    db.commit()
    db.refresh(session)
    return True

def _active_session(db: Session, user_id: int) -> FocusSession | None:
    return (
        db.execute(
            select(FocusSession)
            .where(FocusSession.user_id == user_id)
            .where(FocusSession.status.in_(["running", "paused"]))
            .order_by(FocusSession.started_at.desc())
        )
        .scalars()
        .first()
    )


def _ensure_owns(session: FocusSession | None, user_id: int) -> FocusSession:
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Session not found")
    return session


@router.post("/start", response_model=FocusSessionOut, status_code=201)
def start_focus(payload: FocusStartIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if payload.duration_seconds % 300 != 0:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Duration must be in 5 minute steps")

    existing = _active_session(db, user.id)
    if existing:
        now = _utcnow()
        if not _complete_expired_session(db, existing, now):
            raise HTTPException(status_code=HTTP_409_CONFLICT, detail="Active session exists")

    now = _utcnow()
    session = FocusSession(
        user_id=user.id,
        duration_seconds=payload.duration_seconds,
        started_at=now,
        status="running",
        paused_seconds=0,
        paused_at=None,
        created_at=now,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/pause", response_model=FocusSessionOut)
def pause_focus(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = _ensure_owns(db.get(FocusSession, session_id), user.id)
    if session.status != "running":
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Session is not running")
    session.status = "paused"
    session.paused_at = _utcnow()
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/resume", response_model=FocusSessionOut)
def resume_focus(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = _ensure_owns(db.get(FocusSession, session_id), user.id)
    if session.status != "paused":
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Session is not paused")
    if session.paused_at:
        delta = _utcnow() - session.paused_at
        session.paused_seconds += int(delta.total_seconds())
    session.paused_at = None
    session.status = "running"
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/cancel", response_model=FocusSessionOut)
def cancel_focus(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = _ensure_owns(db.get(FocusSession, session_id), user.id)
    if session.status in {"completed", "canceled"}:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Session already finished")
    if session.paused_at:
        delta = _utcnow() - session.paused_at
        session.paused_seconds += int(delta.total_seconds())
        session.paused_at = None
    session.status = "canceled"
    session.ended_at = _utcnow()
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/complete", response_model=FocusSessionOut)
def complete_focus(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = _ensure_owns(db.get(FocusSession, session_id), user.id)
    if session.status in {"completed", "canceled"}:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Session already finished")
    if session.paused_at:
        delta = _utcnow() - session.paused_at
        session.paused_seconds += int(delta.total_seconds())
        session.paused_at = None
    session.status = "completed"
    session.ended_at = _utcnow()
    db.commit()
    db.refresh(session)
    return session


@router.get("/active", response_model=FocusSessionOut, status_code=200)
def active_focus(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = _active_session(db, user.id)
    if not session:
        return Response(status_code=204)
    if _complete_expired_session(db, session, _utcnow()):
        return Response(status_code=204)
    return session


@router.get("/sessions", response_model=FocusSessionsOut)
def list_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    total = db.execute(
        select(func.count()).select_from(FocusSession).where(FocusSession.user_id == user.id)
    ).scalar_one()
    items = (
        db.execute(
            select(FocusSession)
            .where(FocusSession.user_id == user.id)
            .order_by(FocusSession.started_at.desc())
            .limit(limit)
            .offset(offset)
        )
        .scalars()
        .all()
    )
    return {"items": items, "total": total}
