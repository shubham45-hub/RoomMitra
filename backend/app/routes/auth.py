import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
import io
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile, status
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import OtpChallenge, User
from app.services.delivery import get_otp_delivery
from app.services.phone import normalize_indian_phone
from app.services.security import create_access_token, get_current_user, hash_otp

router = APIRouter(prefix="/auth", tags=["authentication"])
PROFILE_IMAGE_DIR = Path(__file__).resolve().parents[2] / "uploads" / "profiles"
LISTING_IMAGE_DIR = Path(__file__).resolve().parents[2] / "uploads" / "listings"
MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024
PROFILE_IMAGE_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}


class OtpRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=16)


class OtpVerify(OtpRequest):
    code: str = Field(pattern=r"^\d{6}$")


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    preferred_city: str | None = Field(default=None, min_length=2, max_length=100)
    sex: str | None = Field(default=None, pattern="^(male|female)$")
    religion: str | None = Field(default=None, min_length=2, max_length=100)
    origin_state: str | None = Field(default=None, min_length=2, max_length=100)


def profile_data(user: User):
    return {"id": user.id, "phone": user.phone, "name": user.name, "email": user.email,
            "preferred_city": user.preferred_city, "sex": user.sex, "religion": user.religion,
            "origin_state": user.origin_state, "avatar_url": user.avatar_url}


@router.post("/otp/request", status_code=202)
def request_otp(body: OtpRequest, request: Request, db: Session = Depends(get_db)):
    phone = normalize_indian_phone(body.phone)
    now = datetime.now(timezone.utc)
    recent = db.query(OtpChallenge).filter(
        OtpChallenge.phone == phone,
        OtpChallenge.created_at >= now - timedelta(hours=1),
    ).count()
    if recent >= settings.otp_requests_per_hour:
        raise HTTPException(429, "Too many OTP requests; try again later")
    prior = db.query(OtpChallenge).filter(OtpChallenge.phone == phone).order_by(desc(OtpChallenge.created_at)).first()
    if prior and prior.next_send_at > now:
        raise HTTPException(429, "Please wait before requesting another code")
    code = f"{secrets.randbelow(1_000_000):06d}"
    challenge = OtpChallenge(
        phone=phone,
        code_hash=hash_otp(phone, code),
        created_at=now,
        expires_at=now + timedelta(seconds=settings.otp_ttl_seconds),
        next_send_at=now + timedelta(seconds=settings.otp_resend_seconds),
    )
    db.add(challenge)
    db.commit()
    try:
        get_otp_delivery().send(phone, code)
    except Exception as exc:
        db.delete(challenge)
        db.commit()
        raise HTTPException(503, "Could not send the verification code. Please try again later.") from exc
    response = {"detail": "If the number can receive a code, one has been sent."}
    if settings.app_env == "development":
        response["development_otp"] = code
    return response


@router.post("/otp/verify")
def verify_otp(body: OtpVerify, db: Session = Depends(get_db)):
    phone = normalize_indian_phone(body.phone)
    now = datetime.now(timezone.utc)
    challenge = db.query(OtpChallenge).filter(
        OtpChallenge.phone == phone,
        OtpChallenge.consumed_at.is_(None),
    ).order_by(desc(OtpChallenge.created_at)).first()
    if not challenge or challenge.expires_at <= now or challenge.attempts >= settings.otp_max_attempts:
        raise HTTPException(400, "Invalid or expired code")
    challenge.attempts += 1
    if not secrets.compare_digest(challenge.code_hash, hash_otp(phone, body.code)):
        if challenge.attempts >= settings.otp_max_attempts:
            challenge.consumed_at = now
        db.commit()
        raise HTTPException(400, "Invalid or expired code")
    challenge.consumed_at = now
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(phone=phone, name="RoomMitra user", is_active=True)
        db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": profile_data(user),
    }


@router.get("/me")
def read_profile(user: User = Depends(get_current_user)):
    return profile_data(user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile_photo = PROFILE_IMAGE_DIR / Path(user.avatar_url or "").name if user.avatar_url else None
    listing_photos = [
        LISTING_IMAGE_DIR / Path(photo.image_url).name
        for listing in user.listings
        for photo in listing.images
        if photo.image_url
    ]

    db.query(OtpChallenge).filter(OtpChallenge.phone == user.phone).delete(synchronize_session=False)
    db.delete(user)
    db.commit()

    for path in [profile_photo, *listing_photos]:
        if path and path.parent in {PROFILE_IMAGE_DIR, LISTING_IMAGE_DIR}:
            path.unlink(missing_ok=True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/me")
def update_profile(
    updates: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    values = updates.model_dump(exclude_unset=True)
    if "name" in values:
        name = (values["name"] or "").strip()
        if not name:
            raise HTTPException(422, "Name cannot be blank")
        user.name = name
    if "preferred_city" in values:
        preferred_city = (values["preferred_city"] or "").strip()
        if len(preferred_city) < 2:
            raise HTTPException(422, "Enter a city name with at least 2 characters")
        user.preferred_city = preferred_city
    if "sex" in values:
        if values["sex"] not in {"male", "female"}:
            raise HTTPException(422, "Choose male or female")
        user.sex = values["sex"]
    for field in ("religion", "origin_state"):
        if field in values:
            value = (values[field] or "").strip()
            if len(value) < 2:
                raise HTTPException(422, f"Enter your {field.replace('_', ' ')}")
            setattr(user, field, value)
    if "email" in values:
        email = str(values["email"]).lower() if values["email"] is not None else None
        if email:
            other = db.query(User).filter(User.email == email, User.id != user.id).first()
            if other:
                raise HTTPException(409, "That email is already in use")
        user.email = email
    db.commit()
    db.refresh(user)
    return profile_data(user)


@router.post("/me/avatar")
async def upload_profile_avatar(
    image: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = await image.read(MAX_PROFILE_IMAGE_BYTES + 1)
    if len(content) > MAX_PROFILE_IMAGE_BYTES:
        raise HTTPException(413, "Profile photo must be 5 MB or smaller")
    try:
        with Image.open(io.BytesIO(content)) as uploaded:
            if uploaded.format not in PROFILE_IMAGE_FORMATS:
                raise HTTPException(415, "Upload a JPEG, PNG, or WebP image")
            uploaded.verify()
        with Image.open(io.BytesIO(content)) as uploaded:
            uploaded.thumbnail((800, 800))
            safe_image = uploaded.convert("RGB")
            PROFILE_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
            filename = f"{uuid4().hex}.jpg"
            safe_image.save(PROFILE_IMAGE_DIR / filename, "JPEG", quality=88, optimize=True)
    except UnidentifiedImageError as exc:
        raise HTTPException(415, "The uploaded file is not a valid image") from exc
    old_path = Path(__file__).resolve().parents[2] / (user.avatar_url or "").lstrip("/") if user.avatar_url else None
    user.avatar_url = f"/uploads/profiles/{filename}"
    db.commit()
    if old_path and old_path.is_file() and old_path.parent == PROFILE_IMAGE_DIR:
        old_path.unlink(missing_ok=True)
    return {"avatar_url": user.avatar_url}
