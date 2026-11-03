from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4
import io
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import case, func, or_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, joinedload, selectinload

from app.config import settings
from app.database import get_db
from app.models import Listing, ListingContact, ListingImage, ListingInquiry, ListingReaction, ListingReport, ListingStatus, ListingView, SavedListing, User
from app.services.security import get_current_user, get_optional_current_user

router = APIRouter(prefix="/listings", tags=["listings"])
UPLOAD_DIR = settings.upload_dir / "listings"
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_LISTING_IMAGES = 12
ALLOWED_IMAGE_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
LISTING_IMAGE_CATEGORIES = {"HALL", "KITCHEN", "WASHROOM", "BEDROOM", "OTHER"}


def allowed_listing_audiences(user: User) -> list[str]:
    if user.sex in {"male", "female"}:
        return [user.sex.upper(), "ANY"]
    return ["ANY"]


class ListingCreate(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=20, max_length=10000)
    city: str = Field(default="Kolkata", min_length=2, max_length=100)
    locality: str = Field(min_length=2, max_length=150)
    pincode: str | None = Field(default=None, pattern=r"^\d{6}$")
    flat_type: str = Field(min_length=2, max_length=20)
    available_beds: int = Field(default=1, ge=1, le=20)
    occupants_count: int = Field(default=0, ge=0, le=20)
    monthly_rent: int = Field(gt=0)
    rent_basis: Literal["PER_PERSON", "WHOLE_FLAT"] = "PER_PERSON"
    security_deposit: int | None = Field(default=None, ge=0)
    is_furnished: bool = False
    furnishing_status: Literal["FURNISHED", "SEMI_FURNISHED", "UNFURNISHED"] | None = None
    available_for: Literal["MALE", "FEMALE", "ANY"] = "ANY"
    brokerage: int = Field(default=0, ge=0)


class ListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=5, max_length=200)
    description: str | None = Field(default=None, min_length=20, max_length=10000)
    city: str | None = Field(default=None, min_length=2, max_length=100)
    locality: str | None = Field(default=None, min_length=2, max_length=150)
    pincode: str | None = Field(default=None, pattern=r"^\d{6}$")
    flat_type: str | None = Field(default=None, min_length=2, max_length=20)
    available_beds: int | None = Field(default=None, ge=1, le=20)
    occupants_count: int | None = Field(default=None, ge=0, le=20)
    monthly_rent: int | None = Field(default=None, gt=0)
    rent_basis: Literal["PER_PERSON", "WHOLE_FLAT"] | None = None
    security_deposit: int | None = Field(default=None, ge=0)
    is_furnished: bool | None = None
    furnishing_status: Literal["FURNISHED", "SEMI_FURNISHED", "UNFURNISHED"] | None = None
    available_for: Literal["MALE", "FEMALE", "ANY"] | None = None
    brokerage: int | None = Field(default=None, ge=0)
    status: ListingStatus | None = None


class InquiryCreate(BaseModel):
    message: str = Field(min_length=10, max_length=2000)
    share_phone: bool


class ListingReportCreate(BaseModel):
    reason: str = Field(pattern="^(SCAM|WRONG_INFO|DUPLICATE|INAPPROPRIATE|COPYRIGHT|OTHER)$")
    details: str | None = Field(default=None, max_length=1000)


class ListingContactAction(BaseModel):
    method: Literal["CALL", "WHATSAPP"]


class ListingReactionRequest(BaseModel):
    reaction: Literal["LIKE", "DISLIKE"]


class ListingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    title: str
    description: str
    city: str
    locality: str
    pincode: str | None
    flat_type: str
    available_beds: int
    occupants_count: int
    people_needed: int
    monthly_rent: int
    rent_basis: str
    security_deposit: int | None
    is_furnished: bool
    furnishing_status: str
    available_for: str
    brokerage: int
    status: ListingStatus
    owner_name: str
    owner_avatar_url: str | None = None
    created_at: datetime | None = None
    expires_at: datetime
    is_expired: bool
    views_last_day: int
    contacts_total: int
    likes_count: int
    dislikes_count: int
    my_reaction: str | None
    photo_urls: list[str] = Field(default_factory=list)
    photos: list[dict] = Field(default_factory=list)


def serialize(
    listing: Listing,
    views_last_day: int = 0,
    contacts_total: int = 0,
    likes_count: int = 0,
    dislikes_count: int = 0,
    my_reaction: str | None = None,
) -> dict:
    return {
        "id": listing.id,
        "user_id": listing.user_id,
        "title": listing.title,
        "description": listing.description,
        "city": listing.city,
        "locality": listing.locality,
        "pincode": listing.pincode,
        "flat_type": listing.flat_type,
        "available_beds": listing.available_beds,
        "occupants_count": listing.occupants_count,
        "people_needed": listing.available_beds,
        "monthly_rent": listing.monthly_rent,
        "rent_basis": listing.rent_basis,
        "security_deposit": listing.security_deposit,
        "is_furnished": listing.is_furnished,
        "furnishing_status": listing.furnishing_status,
        "available_for": listing.available_for,
        "brokerage": listing.brokerage,
        "status": listing.status,
        "owner_name": listing.owner.name,
        "owner_avatar_url": listing.owner.avatar_url,
        "created_at": listing.created_at,
        "expires_at": listing.expires_at,
        "is_expired": listing.expires_at <= datetime.now(timezone.utc),
        "views_last_day": views_last_day,
        "contacts_total": contacts_total,
        "likes_count": likes_count,
        "dislikes_count": dislikes_count,
        "my_reaction": my_reaction,
        "photo_urls": [image.image_url for image in listing.images],
        "photos": [{"id": image.id, "image_url": image.image_url, "category": image.category} for image in listing.images],
    }


def get_recent_view_counts(db: Session, listings: list[Listing]) -> dict[int, int]:
    listing_ids = [listing.id for listing in listings]
    if not listing_ids:
        return {}
    rows = (
        db.query(ListingView.listing_id, func.count(ListingView.viewer_id))
        .join(Listing, Listing.id == ListingView.listing_id)
        .filter(
            ListingView.listing_id.in_(listing_ids),
            ListingView.last_viewed_at >= datetime.now(timezone.utc) - timedelta(days=1),
            ListingView.viewer_id != Listing.user_id,
        )
        .group_by(ListingView.listing_id)
        .all()
    )
    return {listing_id: count for listing_id, count in rows}


def get_contact_counts(db: Session, listings: list[Listing]) -> dict[int, int]:
    listing_ids = [listing.id for listing in listings]
    if not listing_ids:
        return {}
    rows = (
        db.query(ListingContact.listing_id, func.count(ListingContact.user_id))
        .join(Listing, Listing.id == ListingContact.listing_id)
        .filter(
            ListingContact.listing_id.in_(listing_ids),
            ListingContact.user_id != Listing.user_id,
        )
        .group_by(ListingContact.listing_id)
        .all()
    )
    return {listing_id: count for listing_id, count in rows}


def get_reaction_summaries(db: Session, listings: list[Listing], user_id: int | None) -> dict[int, dict]:
    listing_ids = [listing.id for listing in listings]
    if not listing_ids:
        return {}
    rows = (
        db.query(
            ListingReaction.listing_id,
            func.count(case((ListingReaction.reaction == "LIKE", ListingReaction.id))),
            func.count(case((ListingReaction.reaction == "DISLIKE", ListingReaction.id))),
            func.max(case((ListingReaction.user_id == user_id, ListingReaction.reaction), else_=None)),
        )
        .filter(ListingReaction.listing_id.in_(listing_ids))
        .group_by(ListingReaction.listing_id)
        .all()
    )
    return {
        listing_id: {"likes_count": likes, "dislikes_count": dislikes, "my_reaction": own_reaction}
        for listing_id, likes, dislikes, own_reaction in rows
    }


def serialize_many(db: Session, listings: list[Listing], user_id: int | None = None) -> list[dict]:
    view_counts = get_recent_view_counts(db, listings)
    contact_counts = get_contact_counts(db, listings)
    reaction_summaries = get_reaction_summaries(db, listings, user_id)
    return [
        serialize(
            listing,
            view_counts.get(listing.id, 0),
            contact_counts.get(listing.id, 0),
            **reaction_summaries.get(listing.id, {"likes_count": 0, "dislikes_count": 0, "my_reaction": None}),
        )
        for listing in listings
    ]


def upsert_listing_contact(db: Session, listing_id: int, user_id: int, contacted_at: datetime) -> None:
    contact_upsert = pg_insert(ListingContact).values(
        listing_id=listing_id,
        user_id=user_id,
        first_contacted_at=contacted_at,
        last_contacted_at=contacted_at,
    ).on_conflict_do_update(
        constraint="uq_listing_contact_listing_user",
        set_={"last_contacted_at": contacted_at},
    )
    db.execute(contact_upsert)


@router.post("/{listing_id}/images", status_code=status.HTTP_201_CREATED)
async def upload_listing_images(
    listing_id: int,
    files: list[UploadFile] = File(...),
    categories: list[str] = Form(default=[]),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if listing is None:
        raise HTTPException(404, "Listing not found")
    if listing.user_id != user.id:
        raise HTTPException(403, "You can only add photos to your own listings")
    if not files or len(files) > MAX_LISTING_IMAGES:
        raise HTTPException(400, f"Choose between 1 and {MAX_LISTING_IMAGES} photos")
    current_count = db.query(ListingImage).filter(ListingImage.listing_id == listing_id).count()
    if current_count + len(files) > MAX_LISTING_IMAGES:
        raise HTTPException(400, f"A listing can have up to {MAX_LISTING_IMAGES} photos")
    if categories and len(categories) != len(files):
        raise HTTPException(422, "Provide one photo category for each uploaded image")
    photo_categories = [category.upper() for category in categories] if categories else ["OTHER"] * len(files)
    if any(category not in LISTING_IMAGE_CATEGORIES for category in photo_categories):
        raise HTTPException(422, "Photo category must be Hall, Kitchen, Washroom, Bedroom, or Other")

    validated = []
    for file, category in zip(files, photo_categories):
        data = await file.read(MAX_IMAGE_BYTES + 1)
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "Each photo must be 5 MB or smaller")
        try:
            with Image.open(io.BytesIO(data)) as image:
                if image.width * image.height > 20_000_000:
                    raise HTTPException(400, "Each photo must be 20 megapixels or smaller")
                image.verify()
                image_format = image.format
        except HTTPException:
            raise
        except (UnidentifiedImageError, OSError):
            raise HTTPException(400, "One of the selected files is not a valid image")
        if image_format not in ALLOWED_IMAGE_FORMATS:
            raise HTTPException(400, "Photos must be JPEG, PNG, or WebP images")
        filename = f"{uuid4().hex}{ALLOWED_IMAGE_FORMATS[image_format]}"
        validated.append((filename, data, category))

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    created_paths = []
    try:
        for filename, data, category in validated:
            path = UPLOAD_DIR / filename
            path.write_bytes(data)
            created_paths.append(path)
            db.add(ListingImage(listing_id=listing_id, image_url=f"/uploads/listings/{filename}", category=category))
        db.commit()
    except Exception:
        db.rollback()
        for path in created_paths:
            path.unlink(missing_ok=True)
        raise

    return {"photo_urls": [f"/uploads/listings/{filename}" for filename, _, _ in validated]}


@router.delete("/{listing_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing_image(
    listing_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if listing is None:
        raise HTTPException(404, "Listing not found")
    if listing.user_id != user.id:
        raise HTTPException(403, "You can only remove photos from your own listings")
    photo = db.query(ListingImage).filter(
        ListingImage.id == image_id,
        ListingImage.listing_id == listing_id,
    ).first()
    if photo is None:
        raise HTTPException(404, "Photo not found")

    path = UPLOAD_DIR / Path(photo.image_url).name
    db.delete(photo)
    db.commit()
    path.unlink(missing_ok=True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{listing_id}/inquiries", status_code=status.HTTP_201_CREATED)
def create_listing_inquiry(
    listing_id: int,
    data: InquiryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id,
        Listing.status == ListingStatus.ACTIVE,
        Listing.expires_at > datetime.now(timezone.utc),
        Listing.available_for.in_(allowed_listing_audiences(user)),
    ).first()
    if listing is None:
        raise HTTPException(404, "Listing not found")
    if listing.user_id == user.id:
        raise HTTPException(400, "You cannot send an inquiry about your own listing")
    if not data.share_phone:
        raise HTTPException(400, "Please agree to share your verified phone number so the lister can reply")
    message = data.message.strip()
    if len(message) < 10:
        raise HTTPException(422, "Your message must contain at least 10 non-space characters")

    window_start = datetime.now(timezone.utc) - timedelta(minutes=10)
    recent_count = db.query(ListingInquiry).filter(
        ListingInquiry.sender_id == user.id,
        ListingInquiry.created_at >= window_start,
    ).count()
    if recent_count >= 5:
        raise HTTPException(429, "You have sent several inquiries recently. Try again in a few minutes.")

    inquiry = ListingInquiry(
        listing_id=listing.id,
        sender_id=user.id,
        owner_id=listing.user_id,
        message=message,
        phone_shared=True,
    )
    db.add(inquiry)
    upsert_listing_contact(db, listing.id, user.id, datetime.now(timezone.utc))
    db.commit()
    db.refresh(inquiry)
    contact_count = get_contact_counts(db, [listing]).get(listing.id, 0)
    return {
        "id": inquiry.id,
        "message": "Your inquiry was sent to the lister.",
        "contacts_total": contact_count,
    }


@router.get("/inquiries/inbox")
def get_inquiry_inbox(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inquiries = (
        db.query(ListingInquiry)
        .options(joinedload(ListingInquiry.listing), joinedload(ListingInquiry.sender))
        .filter(ListingInquiry.owner_id == user.id)
        .order_by(ListingInquiry.created_at.desc())
        .limit(100)
        .all()
    )
    opened_at = datetime.now(timezone.utc)
    results = []
    has_unread = False
    for inquiry in inquiries:
        is_new = inquiry.read_at is None
        if is_new:
            has_unread = True
            inquiry.read_at = opened_at
        results.append({
            "id": inquiry.id,
            "listing_id": inquiry.listing_id,
            "listing_title": inquiry.listing.title,
            "sender_name": inquiry.sender.name,
            "sender_phone": inquiry.sender.phone if inquiry.phone_shared else None,
            "message": inquiry.message,
            "created_at": inquiry.created_at,
            "is_new": is_new,
        })
    if has_unread:
        db.commit()
    return results


@router.get("/inquiries/unread-count")
def get_unread_inquiry_count(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    count = db.query(ListingInquiry).filter(
        ListingInquiry.owner_id == user.id,
        ListingInquiry.read_at.is_(None),
    ).count()
    return {"unread_count": count}


@router.get("/{listing_id}/contact")
def get_listing_contact(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = (
        db.query(Listing)
        .options(joinedload(Listing.owner))
        .filter(
            Listing.id == listing_id,
            Listing.status == ListingStatus.ACTIVE,
            Listing.expires_at > datetime.now(timezone.utc),
            Listing.available_for.in_(allowed_listing_audiences(user)),
        )
        .first()
    )
    if listing is None:
        raise HTTPException(404, "Listing not found")
    if listing.user_id == user.id:
        raise HTTPException(400, "This is your listing")
    if not listing.owner.phone:
        raise HTTPException(404, "The lister has no verified phone number available")
    return {"owner_name": listing.owner.name, "phone": listing.owner.phone}


@router.post("/{listing_id}/contact-actions")
def record_listing_contact_action(
    listing_id: int,
    data: ListingContactAction,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id,
        Listing.status == ListingStatus.ACTIVE,
        Listing.expires_at > datetime.now(timezone.utc),
        Listing.available_for.in_(allowed_listing_audiences(user)),
    ).first()
    if listing is None:
        raise HTTPException(404, "Listing not found")
    if listing.user_id == user.id:
        raise HTTPException(400, "You cannot contact yourself about your own listing")

    upsert_listing_contact(db, listing.id, user.id, datetime.now(timezone.utc))
    db.commit()
    return {"contacts_total": get_contact_counts(db, [listing]).get(listing.id, 0)}


@router.post("/{listing_id}/reaction")
def react_to_listing(
    listing_id: int,
    data: ListingReactionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id,
        Listing.status == ListingStatus.ACTIVE,
        Listing.expires_at > datetime.now(timezone.utc),
        Listing.available_for.in_(allowed_listing_audiences(user)),
    ).first()
    if listing is None:
        raise HTTPException(404, "Listing not found")
    if listing.user_id == user.id:
        raise HTTPException(400, "You cannot react to your own listing")

    existing = db.query(ListingReaction).filter(
        ListingReaction.listing_id == listing.id,
        ListingReaction.user_id == user.id,
    ).first()
    if existing and existing.reaction == data.reaction:
        db.delete(existing)
    else:
        vote_upsert = pg_insert(ListingReaction).values(
            listing_id=listing.id,
            user_id=user.id,
            reaction=data.reaction,
            updated_at=datetime.now(timezone.utc),
        ).on_conflict_do_update(
            constraint="uq_listing_reaction_listing_user",
            set_={"reaction": data.reaction, "updated_at": datetime.now(timezone.utc)},
        )
        db.execute(vote_upsert)
    db.commit()
    return get_reaction_summaries(db, [listing], user.id).get(
        listing.id,
        {"likes_count": 0, "dislikes_count": 0, "my_reaction": None},
    )


@router.post("/{listing_id}/reports", status_code=status.HTTP_201_CREATED)
def report_listing(
    listing_id: int,
    data: ListingReportCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id,
        Listing.status == ListingStatus.ACTIVE,
        Listing.expires_at > datetime.now(timezone.utc),
        Listing.available_for.in_(allowed_listing_audiences(user)),
    ).first()
    if listing is None:
        raise HTTPException(404, "Listing not found")
    if listing.user_id == user.id:
        raise HTTPException(400, "You cannot report your own listing")

    recent_count = db.query(ListingReport).filter(
        ListingReport.reporter_id == user.id,
        ListingReport.created_at >= datetime.now(timezone.utc) - timedelta(hours=1),
    ).count()
    if recent_count >= 5:
        raise HTTPException(429, "You have submitted several reports recently. Try again later.")

    existing = db.query(ListingReport).filter(
        ListingReport.listing_id == listing_id,
        ListingReport.reporter_id == user.id,
        ListingReport.status.in_(["OPEN", "REVIEWING"]),
    ).first()
    if existing:
        raise HTTPException(409, "You already have an open report for this listing")

    report = ListingReport(
        listing_id=listing_id,
        reporter_id=user.id,
        reason=data.reason,
        details=data.details.strip() if data.details and data.details.strip() else None,
    )
    db.add(report)
    db.commit()
    return {"message": "Thanks. Your report was sent to the application owner for review."}


@router.post("", response_model=ListingOut, status_code=status.HTTP_201_CREATED)
def create_listing(
    data: ListingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    values = data.model_dump()
    furnishing_status = values.get("furnishing_status") or (
        "FURNISHED" if values.get("is_furnished") else "UNFURNISHED"
    )
    values["furnishing_status"] = furnishing_status
    values["is_furnished"] = furnishing_status == "FURNISHED"
    listing = Listing(
        **values,
        user_id=user.id,
        status=ListingStatus.ACTIVE,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    listing.owner = user
    return serialize(listing)


@router.get("", response_model=list[ListingOut])
def browse_listings(
    keyword: str | None = Query(default=None, min_length=2, max_length=100),
    city: str | None = Query(default=None, min_length=2, max_length=100),
    flat_type: str | None = Query(default=None, min_length=2, max_length=20),
    locality: str | None = Query(default=None, min_length=2, max_length=150),
    min_rent: int | None = Query(default=None, ge=1),
    max_rent: int | None = Query(default=None, ge=1),
    min_beds: int | None = Query(default=None, ge=1, le=20),
    furnishing_status: Literal["FURNISHED", "SEMI_FURNISHED", "UNFURNISHED"] | None = Query(default=None),
    availability: Literal["AVAILABLE", "FILLED"] | None = Query(default=None),
    sort: Literal["newest", "rent_low", "rent_high"] = Query(default="newest"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    response: Response = None,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_current_user),
):
    requested_city = city.strip() if city and city.strip() else None
    city_name = requested_city or (user.preferred_city.strip() if user and user.preferred_city else "")
    has_other_filters = any(value and value.strip() for value in (keyword, flat_type, locality)) or any(
        value is not None for value in (min_rent, max_rent, min_beds)
    )
    has_other_filters = has_other_filters or furnishing_status is not None or availability is not None
    if has_other_filters and not city_name:
        raise HTTPException(422, "Enter a city before using the other filters")
    query = db.query(Listing).options(joinedload(Listing.owner), selectinload(Listing.images)).filter(
        Listing.status.in_([ListingStatus.ACTIVE, ListingStatus.FILLED]),
        Listing.expires_at > datetime.now(timezone.utc),
    )
    if user:
        query = query.filter(
            Listing.user_id != user.id,
            Listing.available_for.in_(allowed_listing_audiences(user)),
        )
    if city_name:
        query = query.filter(Listing.city.ilike(city_name))
    if keyword:
        escaped_keyword = keyword.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped_keyword}%"
        query = query.filter(or_(
            Listing.title.ilike(pattern, escape="\\"),
            Listing.description.ilike(pattern, escape="\\"),
            Listing.locality.ilike(pattern, escape="\\"),
            Listing.city.ilike(pattern, escape="\\"),
        ))
    if flat_type:
        query = query.filter(Listing.flat_type.ilike(flat_type.strip()))
    if locality:
        query = query.filter(Listing.locality.ilike(f"%{locality.strip()}%"))
    if min_rent is not None:
        query = query.filter(Listing.monthly_rent >= min_rent)
    if max_rent is not None:
        query = query.filter(Listing.monthly_rent <= max_rent)
    if min_beds is not None:
        query = query.filter(Listing.available_beds >= min_beds)
    if furnishing_status:
        query = query.filter(Listing.furnishing_status == furnishing_status)
    if availability == "AVAILABLE":
        query = query.filter(Listing.status == ListingStatus.ACTIVE)
    elif availability == "FILLED":
        query = query.filter(Listing.status == ListingStatus.FILLED)
    sort_columns = {
        "newest": (case((Listing.status == ListingStatus.ACTIVE, 0), else_=1), Listing.created_at.desc(), Listing.id.desc()),
        "rent_low": (case((Listing.status == ListingStatus.ACTIVE, 0), else_=1), Listing.monthly_rent.asc(), Listing.created_at.desc(), Listing.id.desc()),
        "rent_high": (case((Listing.status == ListingStatus.ACTIVE, 0), else_=1), Listing.monthly_rent.desc(), Listing.created_at.desc(), Listing.id.desc()),
    }
    total_count = query.order_by(None).count()
    if response is not None:
        response.headers["X-Total-Count"] = str(total_count)
    listings = query.order_by(*sort_columns[sort]).offset(offset).limit(limit).all()
    return serialize_many(db, listings, user.id if user else None)

@router.get("/mine", response_model=list[ListingOut])
def my_listings(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listings = (
        db.query(Listing)
        .options(joinedload(Listing.owner), selectinload(Listing.images))
        .filter(Listing.user_id == user.id)
        .order_by(Listing.created_at.desc())
        .all()
    )
    return serialize_many(db, listings, user.id)

@router.get("/saved", response_model=list[ListingOut])
def get_saved_listings(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listings = (
        db.query(Listing)
        .join(SavedListing, SavedListing.listing_id == Listing.id)
        .options(joinedload(Listing.owner), selectinload(Listing.images))
        .filter(
            SavedListing.user_id == user.id,
            Listing.status == ListingStatus.ACTIVE,
            Listing.expires_at > datetime.now(timezone.utc),
            Listing.available_for.in_(allowed_listing_audiences(user)),
        )
        .order_by(SavedListing.created_at.desc())
        .all()
    )
    return serialize_many(db, listings, user.id)


@router.post("/{listing_id}/save")
def save_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id,
        Listing.status == ListingStatus.ACTIVE,
        Listing.expires_at > datetime.now(timezone.utc),
        Listing.available_for.in_(allowed_listing_audiences(user)),
    ).first()

    if listing is None:
        raise HTTPException(404, "Listing not found")

    saved = db.query(SavedListing).filter(
        SavedListing.user_id == user.id,
        SavedListing.listing_id == listing_id,
    ).first()

    if saved is None:
        db.add(SavedListing(user_id=user.id, listing_id=listing_id))
        db.commit()

    return {"saved": True}


@router.delete("/{listing_id}/save", status_code=status.HTTP_204_NO_CONTENT)
def remove_saved_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    saved = db.query(SavedListing).filter(
        SavedListing.user_id == user.id,
        SavedListing.listing_id == listing_id,
    ).first()

    if saved is not None:
        db.delete(saved)
        db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/{listing_id}", response_model=ListingOut)
def get_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_current_user),
):
    listing = db.query(Listing).options(joinedload(Listing.owner), selectinload(Listing.images)).filter(Listing.id == listing_id).first()
    if (
        listing is None
        or listing.status not in {ListingStatus.ACTIVE, ListingStatus.FILLED}
        or listing.expires_at <= datetime.now(timezone.utc)
        or (user is not None and listing.available_for not in allowed_listing_audiences(user))
    ):
        raise HTTPException(404, "Listing not found")
    reaction = get_reaction_summaries(db, [listing], user.id if user else None).get(
        listing.id,
        {"likes_count": 0, "dislikes_count": 0, "my_reaction": None},
    )
    return serialize(
        listing,
        get_recent_view_counts(db, [listing]).get(listing.id, 0),
        get_contact_counts(db, [listing]).get(listing.id, 0),
        **reaction,
    )


@router.post("/{listing_id}/view")
def record_listing_view(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id,
        Listing.status.in_([ListingStatus.ACTIVE, ListingStatus.FILLED]),
        Listing.expires_at > datetime.now(timezone.utc),
    ).first()
    if listing is None:
        raise HTTPException(404, "Listing not found")

    now = datetime.now(timezone.utc)
    if user.id != listing.user_id:
        view_upsert = pg_insert(ListingView).values(
            listing_id=listing.id,
            viewer_id=user.id,
            last_viewed_at=now,
        ).on_conflict_do_update(
            constraint="uq_listing_view_listing_viewer",
            set_={"last_viewed_at": now},
        )
        db.execute(view_upsert)
        db.query(ListingView).filter(
            ListingView.last_viewed_at < now - timedelta(days=1),
        ).delete(synchronize_session=False)
        db.commit()

    count = get_recent_view_counts(db, [listing]).get(listing.id, 0)
    return {"views_last_day": count}


@router.patch("/{listing_id}", response_model=ListingOut)
def update_listing(
    listing_id: int,
    updates: ListingUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = db.query(Listing).options(joinedload(Listing.owner), selectinload(Listing.images)).filter(Listing.id == listing_id).first()
    if listing is None:
        raise HTTPException(404, "Listing not found")
    if listing.user_id != user.id:
        raise HTTPException(403, "You can only edit your own listings")
    update_values = updates.model_dump(exclude_unset=True)
    if update_values.get("furnishing_status") is not None:
        update_values["is_furnished"] = update_values["furnishing_status"] == "FURNISHED"
    elif "is_furnished" in update_values and update_values["is_furnished"] is not None:
        update_values["furnishing_status"] = "FURNISHED" if update_values["is_furnished"] else "UNFURNISHED"
    if update_values.get("status") == ListingStatus.ACTIVE and listing.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(409, "This listing has expired. Renew it to publish it again.")
    for key, value in update_values.items():
        if value is None and key not in {"pincode", "security_deposit"}:
            raise HTTPException(422, f"{key} cannot be null")
        setattr(listing, key, value)
    db.commit()
    db.refresh(listing)
    return serialize(
        listing,
        get_recent_view_counts(db, [listing]).get(listing.id, 0),
        get_contact_counts(db, [listing]).get(listing.id, 0),
    )


@router.post("/{listing_id}/renew", response_model=ListingOut)
def renew_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = db.query(Listing).options(joinedload(Listing.owner), selectinload(Listing.images)).filter(
        Listing.id == listing_id,
        Listing.user_id == user.id,
    ).first()
    if listing is None:
        raise HTTPException(404, "Listing not found")
    listing.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    listing.status = ListingStatus.ACTIVE
    db.commit()
    db.refresh(listing)
    return serialize(
        listing,
        get_recent_view_counts(db, [listing]).get(listing.id, 0),
        get_contact_counts(db, [listing]).get(listing.id, 0),
    )


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if listing is None:
        raise HTTPException(404, "Listing not found")
    if listing.user_id != user.id:
        raise HTTPException(403, "You can only delete your own listings")
    image_paths = [UPLOAD_DIR / Path(image.image_url).name for image in listing.images]
    db.delete(listing)
    db.commit()
    for path in image_paths:
        path.unlink(missing_ok=True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

