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
    sms_provider: str = os.getenv("SMS_PROVIDER", "local").lower()
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_from_number: str = os.getenv("TWILIO_FROM_NUMBER", "")
    twilio_messaging_service_sid: str = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "")
    otp_sms_template: str = os.getenv(
        "OTP_SMS_TEMPLATE",
        "Your RoomMitra login code is {code}. It expires in {minutes} minutes.",
    )
    moderator_phones: frozenset[str] = frozenset(
        phone.strip() for phone in os.getenv("MODERATOR_PHONES", "").split(",") if phone.strip()
    )
settings = Settings()
def validate_settings():
    if settings.app_env != "development":
        if len(settings.jwt_secret_key) < 32 or len(settings.otp_hmac_secret) < 32:
            raise RuntimeError("JWT_SECRET_KEY and OTP_HMAC_SECRET must each be at least 32 characters outside development")
        if settings.sms_provider != "twilio":
            raise RuntimeError("Set SMS_PROVIDER=twilio outside development; local OTP delivery is development-only")
        if not settings.twilio_account_sid or not settings.twilio_auth_token:
            raise RuntimeError("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required for SMS delivery")
        if bool(settings.twilio_from_number) == bool(settings.twilio_messaging_service_sid):
            raise RuntimeError("Configure exactly one of TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID")
        if "{code}" not in settings.otp_sms_template:
            raise RuntimeError("OTP_SMS_TEMPLATE must contain the {code} placeholder")
