import io
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import PasswordResetChallenge, User
from app.services.object_storage import delete_upload, resolve_upload_url, save_upload
from app.services.password_reset_delivery import send_password_reset_code
from app.services.phone import normalize_indian_phone
from app.services.security import (
    create_access_token,
    get_current_user,
    hash_password_reset_code,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["authentication"])
PROFILE_IMAGE_DIR = settings.upload_dir / "profiles"
LISTING_IMAGE_DIR = settings.upload_dir / "listings"
MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024
PROFILE_IMAGE_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}


class SignUp(BaseModel):
    phone: str = Field(min_length=10, max_length=16)
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class SignIn(BaseModel):
    phone: str = Field(min_length=10, max_length=16)
    password: str = Field(min_length=1, max_length=128)


class PasswordResetRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=16)


class PasswordResetConfirm(PasswordResetRequest):
    code: str = Field(pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=128)


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
            "origin_state": user.origin_state, "avatar_url": resolve_upload_url(user.avatar_url)}


def auth_response(user: User):
    return {
        "access_token": create_access_token(user.id, user.password_version),
        "token_type": "bearer",
        "user": profile_data(user),
    }


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def sign_up(body: SignUp, db: Session = Depends(get_db)):
    phone = normalize_indian_phone(body.phone)
    if db.query(User.id).filter(User.phone == phone).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this mobile number already exists")

    name = body.name.strip()
    if not name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Name cannot be blank")

    user = User(
        phone=phone,
        name=name,
        password_hash=hash_password(body.password),
        is_active=True,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with this mobile number already exists"
        ) from exc
    db.refresh(user)
    return auth_response(user)


@router.post("/signin")
def sign_in(body: SignIn, db: Session = Depends(get_db)):
    phone = normalize_indian_phone(body.phone)
    user = db.query(User).filter(User.phone == phone).first()
    if user is None or not user.is_active or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid mobile number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return auth_response(user)


@router.post("/password-reset/request", status_code=status.HTTP_202_ACCEPTED)
def request_password_reset(body: PasswordResetRequest, db: Session = Depends(get_db)):
    phone = normalize_indian_phone(body.phone)
    user = db.query(User).filter(User.phone == phone, User.is_active.is_(True)).with_for_update().first()
    response = {
        "detail": "If an account exists for this number, a reset code may arrive shortly."
    }
    if user is None:
        return response

    now = datetime.now(timezone.utc)
    db.query(PasswordResetChallenge).filter(
        PasswordResetChallenge.phone == phone,
        PasswordResetChallenge.created_at < now - timedelta(days=1),
    ).delete(synchronize_session=False)
    recent_requests = db.query(PasswordResetChallenge).filter(
        PasswordResetChallenge.phone == phone,
        PasswordResetChallenge.created_at >= now - timedelta(hours=1),
    ).count()
    latest = db.query(PasswordResetChallenge).filter(
        PasswordResetChallenge.phone == phone,
    ).order_by(desc(PasswordResetChallenge.created_at)).first()
    if (
        recent_requests >= settings.password_reset_requests_per_hour
        or (
            latest is not None
            and db.query(PasswordResetChallenge.id).filter(
                PasswordResetChallenge.id == latest.id,
                PasswordResetChallenge.next_send_at > now,
            ).first()
        )
    ):
        db.commit()
        return response

    db.query(PasswordResetChallenge).filter(
        PasswordResetChallenge.phone == phone,
        PasswordResetChallenge.consumed_at.is_(None),
    ).update(
        {PasswordResetChallenge.consumed_at: now},
        synchronize_session=False,
    )
    code = f"{secrets.randbelow(1_000_000):06d}"
    challenge = PasswordResetChallenge(
        phone=phone,
        code_hash=hash_password_reset_code(phone, code),
        created_at=now,
        expires_at=now + timedelta(seconds=settings.password_reset_code_ttl_seconds),
        next_send_at=now + timedelta(seconds=settings.password_reset_resend_seconds),
    )
    db.add(challenge)
    db.commit()
    try:
        send_password_reset_code(phone, code)
    except Exception as exc:
        challenge.consumed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Could not send a password reset code. Please try again later.",
        ) from exc

    if settings.app_env == "development":
        response["development_code"] = code
    return response


@router.post("/password-reset/confirm")
def confirm_password_reset(body: PasswordResetConfirm, db: Session = Depends(get_db)):
    phone = normalize_indian_phone(body.phone)
    now = datetime.now(timezone.utc)
    user = db.query(User).filter(
        User.phone == phone,
        User.is_active.is_(True),
    ).with_for_update().first()
    challenge = db.query(PasswordResetChallenge).filter(
        PasswordResetChallenge.phone == phone,
        PasswordResetChallenge.consumed_at.is_(None),
        PasswordResetChallenge.expires_at > now,
        PasswordResetChallenge.attempts < settings.password_reset_max_attempts,
    ).order_by(desc(PasswordResetChallenge.created_at)).with_for_update().first()
    if challenge is None or user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired reset code")

    challenge.attempts += 1
    expected_hash = hash_password_reset_code(phone, body.code)
    if not secrets.compare_digest(challenge.code_hash, expected_hash):
        if challenge.attempts >= settings.password_reset_max_attempts:
            challenge.consumed_at = now
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired reset code")

    user.password_hash = hash_password(body.new_password)
    user.password_version += 1
    challenge.consumed_at = now
    db.commit()
    return {"detail": "Password reset successfully. You can now sign in."}


@router.get("/me")
def read_profile(user: User = Depends(get_current_user)):
    return profile_data(user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile_photo = user.avatar_url
    listing_photos = [
        photo.image_url
        for listing in user.listings
        for photo in listing.images
        if photo.image_url
    ]

    db.query(PasswordResetChallenge).filter(
        PasswordResetChallenge.phone == user.phone
    ).delete(synchronize_session=False)
    db.delete(user)
    db.commit()

    delete_upload(profile_photo, PROFILE_IMAGE_DIR)
    for photo_url in listing_photos:
        delete_upload(photo_url, LISTING_IMAGE_DIR)
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
            filename = f"{uuid4().hex}.jpg"
            encoded_image = io.BytesIO()
            safe_image.save(encoded_image, "JPEG", quality=88, optimize=True)
    except UnidentifiedImageError as exc:
        raise HTTPException(415, "The uploaded file is not a valid image") from exc
    previous_avatar = user.avatar_url
    avatar_url = save_upload(
        key=f"profiles/{user.id}/{filename}",
        content=encoded_image.getvalue(),
        content_type="image/jpeg",
        local_path=PROFILE_IMAGE_DIR / filename,
        local_url=f"/uploads/profiles/{filename}",
    )
    user.avatar_url = avatar_url
    try:
        db.commit()
    except Exception:
        db.rollback()
        delete_upload(avatar_url, PROFILE_IMAGE_DIR)
        raise
    delete_upload(previous_avatar, PROFILE_IMAGE_DIR)
    return {"avatar_url": resolve_upload_url(avatar_url)}
