import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
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


class OtpRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=16)


class OtpVerify(OtpRequest):
    code: str = Field(pattern=r"^\d{6}$")


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None


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
    except Exception:
        db.delete(challenge)
        db.commit()
        raise HTTPException(503, "OTP delivery is not configured")
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
        "user": {"id": user.id, "phone": user.phone, "name": user.name, "email": user.email},
    }


@router.get("/me")
def read_profile(user: User = Depends(get_current_user)):
    return {"id": user.id, "phone": user.phone, "name": user.name, "email": user.email}


@router.patch("/me")
def update_profile(
    updates: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    values = updates.model_dump(exclude_unset=True)
    if "name" in values:
        user.name = values["name"].strip()
    if "email" in values:
        email = str(values["email"]).lower() if values["email"] is not None else None
        if email:
            other = db.query(User).filter(User.email == email, User.id != user.id).first()
            if other:
                raise HTTPException(409, "That email is already in use")
        user.email = email
    db.commit()
    db.refresh(user)
    return {"id": user.id, "phone": user.phone, "name": user.name, "email": user.email}
