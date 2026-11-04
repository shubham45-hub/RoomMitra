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
    password_reset_hmac_secret: str = os.getenv("PASSWORD_RESET_HMAC_SECRET", "")
    password_reset_code_ttl_seconds: int = int(os.getenv("PASSWORD_RESET_CODE_TTL_SECONDS", "300"))
    password_reset_resend_seconds: int = int(os.getenv("PASSWORD_RESET_RESEND_SECONDS", "60"))
    password_reset_max_attempts: int = int(os.getenv("PASSWORD_RESET_MAX_ATTEMPTS", "5"))
    password_reset_requests_per_hour: int = int(os.getenv("PASSWORD_RESET_REQUESTS_PER_HOUR", "5"))
    sms_provider: str = os.getenv("SMS_PROVIDER", "local").lower()
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_from_number: str = os.getenv("TWILIO_FROM_NUMBER", "")
    twilio_messaging_service_sid: str = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "")
    password_reset_sms_template: str = os.getenv(
        "PASSWORD_RESET_SMS_TEMPLATE",
        "Your RoomMitra password reset code is {code}. It expires in {minutes} minutes.",
    )
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
        if len(settings.jwt_secret_key) < 32 or len(settings.password_reset_hmac_secret) < 32:
            raise RuntimeError(
                "JWT_SECRET_KEY and PASSWORD_RESET_HMAC_SECRET must each be at least 32 characters outside development"
            )
        if settings.sms_provider != "twilio":
            raise RuntimeError("Set SMS_PROVIDER=twilio outside development for password recovery")
        if not settings.twilio_account_sid or not settings.twilio_auth_token:
            raise RuntimeError("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required for password recovery")
        if bool(settings.twilio_from_number) == bool(settings.twilio_messaging_service_sid):
            raise RuntimeError("Configure exactly one of TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID")
        if "{code}" not in settings.password_reset_sms_template:
            raise RuntimeError("PASSWORD_RESET_SMS_TEMPLATE must contain the {code} placeholder")
