import os
from dataclasses import dataclass
from pathlib import Path

from app.environment import BACKEND_DIR, load_project_environment

load_project_environment()


def _csv_setting(name: str, default: str = "") -> tuple[str, ...]:
    return tuple(value.strip() for value in os.getenv(name, default).split(",") if value.strip())


@dataclass(frozen=True)
class Settings:
    app_env: str = os.getenv("APP_ENV", "development").lower()
    cors_origins: tuple[str, ...] = _csv_setting(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    )
    allowed_hosts: tuple[str, ...] = _csv_setting(
        "ALLOWED_HOSTS", "localhost,127.0.0.1,testserver"
    )
    upload_dir: Path = Path(os.getenv(
        "UPLOAD_DIR",
        "/tmp/roommitra-uploads" if os.getenv("VERCEL") == "1"
        else str(Path(__file__).resolve().parents[1] / "uploads"),
    )).resolve()
    object_storage_bucket: str = os.getenv("NEON_STORAGE_BUCKET", "assets")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    moderator_phones: frozenset[str] = frozenset(
        phone.strip() for phone in os.getenv("MODERATOR_PHONES", "").split(",") if phone.strip()
    )
settings = Settings()
def validate_settings():
    if settings.app_env != "development":
        if not settings.cors_origins or "*" in settings.cors_origins:
            raise RuntimeError("Set CORS_ORIGINS to the exact production frontend origin(s)")
        if not settings.allowed_hosts or "*" in settings.allowed_hosts:
            raise RuntimeError("Set ALLOWED_HOSTS to the production API hostname(s)")
        if len(settings.jwt_secret_key) < 32:
            raise RuntimeError("JWT_SECRET_KEY must be at least 32 characters outside development")
