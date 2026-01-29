from __future__ import annotations

from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
from app.core.config import settings

ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Funciones de seguridad: hash de contraseñas y gestion de tokens JWT
# Hashing de contraseñas
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Verificacion de contraseñas
def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)

# Creacion de token de acceso JWT
def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.auth_token_ttl_minutes)
    payload = {"sub": str(user_id), "iat": int(now.timestamp()), "exp": exp}
    return jwt.encode(payload, settings.auth_secret, algorithm=ALGORITHM)

# Decodificacion de token de acceso JWT
def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.auth_secret, algorithms=[ALGORITHM])
    except Exception:
        return None
    sub = payload.get("sub")
    try:
        return int(sub)
    except (TypeError, ValueError):
        return None
