import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

bearer_scheme = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)
PASSWORD_HASH_ITERATIONS = 600_000


def _jwt_secret() -> str:
    return settings.jwt_secret_key or "development-only-change-me"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt, PASSWORD_HASH_ITERATIONS
    )
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt.hex()}${password_hash.hex()}"


def verify_password(password: str, encoded_hash: str | None) -> bool:
    if not encoded_hash:
        return False
    try:
        algorithm, iterations, salt_hex, hash_hex = encoded_hash.split("$")
        if algorithm != "pbkdf2_sha256" or int(iterations) != PASSWORD_HASH_ITERATIONS:
            return False
        expected_hash = bytes.fromhex(hash_hex)
        actual_hash = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations)
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual_hash, expected_hash)


def hash_password_reset_code(phone: str, code: str) -> str:
    secret = settings.password_reset_hmac_secret or "development-only-change-me"
    return hmac.new(
        secret.encode(), f"{phone}:{code}".encode(), hashlib.sha256
    ).hexdigest()


def create_access_token(user_id: int, password_version: int = 0) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": str(user_id),
            "ver": password_version,
            "iat": now,
            "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
        },
        _jwt_secret(),
        algorithm=settings.jwt_algorithm,
    )


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), db: Session = Depends(get_db)) -> User:
    token = credentials.credentials
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[settings.jwt_algorithm])
        subject = payload.get("sub")
        user_id = int(subject)
        password_version = int(payload.get("ver", 0))
    except (jwt.PyJWTError, TypeError, ValueError):
        raise unauthorized
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if user is None or user.password_version != password_version:
        raise unauthorized
    return user


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None:
        return None
    return get_current_user(credentials, db)
