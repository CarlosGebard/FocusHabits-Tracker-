from __future__ import annotations

from pathlib import Path

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(API_ROOT / ".env", ".env"),
        env_file_encoding="utf-8",
    )

    app_name: str = "Tempo"
    api_key: str = Field(default="changeme", alias="API_KEY")
    database_url: str = Field(default="", alias="DATABASE_URL")
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")
    media_root: str = Field(default="/data/media", alias="MEDIA_ROOT")
    base_url: str = Field(default="http://localhost", alias="BASE_URL")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    auth_secret: str = Field(default="dev-secret", alias="AUTH_SECRET")
    auth_cookie_name: str = Field(default="tempo_session", alias="AUTH_COOKIE_NAME")
    auth_cookie_secure: bool = Field(default=False, alias="AUTH_COOKIE_SECURE")
    auth_cookie_samesite: Literal["lax", "strict", "none"] = Field(
        default="lax", alias="AUTH_COOKIE_SAMESITE"
    )
    auth_token_ttl_minutes: int = Field(default=60 * 24 * 7, alias="AUTH_TOKEN_TTL_MINUTES")

    def cors_list(self) -> list[str]:
        raw = [item.strip() for item in self.cors_origins.split(",") if item.strip()]
        return raw or ["*"]

    def model_post_init(self, __context) -> None:  # type: ignore[override]
        if not self.database_url:
            raise ValueError("DATABASE_URL is required")


settings = Settings()
