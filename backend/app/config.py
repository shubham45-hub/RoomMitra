import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
@dataclass(frozen=True)
class Settings:
    app_env: str = os.getenv("APP_ENV", "development").lower()
    otp_hmac_secret: str = os.getenv("OTP_HMAC_SECRET", "")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    otp_ttl_seconds: int = int(os.getenv("OTP_TTL_SECONDS", "300"))
    otp_resend_seconds: int = int(os.getenv("OTP_RESEND_SECONDS", "60"))
    otp_max_attempts: int = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
    otp_requests_per_hour: int = int(os.getenv("OTP_REQUESTS_PER_HOUR", "5"))
    moderator_phones: frozenset[str] = frozenset(
        phone.strip() for phone in os.getenv("MODERATOR_PHONES", "").split(",") if phone.strip()
    )
settings = Settings()
def validate_settings():
    if settings.app_env != "development":
        if len(settings.jwt_secret_key) < 32 or len(settings.otp_hmac_secret) < 32:
            raise RuntimeError("JWT_SECRET_KEY and OTP_HMAC_SECRET must each be at least 32 characters outside development")
