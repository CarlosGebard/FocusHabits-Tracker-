from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.status import HTTP_401_UNAUTHORIZED

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut

# Router relacionado a autenticacion y gestion de usuarios con prefijo /api/auth
router = APIRouter(prefix="/api/auth", tags=["auth"])

# Configura la cookie de autenticacion en la respuesta
def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        samesite=settings.auth_cookie_samesite,
        secure=settings.auth_cookie_secure,
        max_age=settings.auth_token_ttl_minutes * 60,
        path="/",
    )

# Endpoint de login de usuario , verifica las credenciales y devuelve el usuario
@router.post("/login", response_model=UserOut)
def login(payload: UserLogin, response: Response, db: Session = Depends(get_db)):
    username = payload.username.lower().strip()
    user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(user.id)
    _set_auth_cookie(response, token)
    return user

# Endpoint de creacion de usuario , solo si no existe ningun usuario
@router.post("/create-user", response_model=UserOut)
def create_user(payload: UserCreate, response: Response, db: Session = Depends(get_db)):
    existing_any = db.execute(select(User).limit(1)).scalar_one_or_none()
    if existing_any:
        raise HTTPException(status_code=403, detail="User creation is disabled")

    username = payload.username.lower().strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    existing = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="User already exists")

    user = User(username=username, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    _set_auth_cookie(response, token)
    return user

# Endpoint de logout de usuario , elimina la cookie de autenticacion
@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(settings.auth_cookie_name, path="/")
    return {"ok": True}


# Endpoint para obtener los datos del usuario actual autenticado
@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
