from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4
import io

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.models import Listing, ListingImage, ListingInquiry, ListingStatus, SavedListing, User
from app.services.security import get_current_user

router = APIRouter(prefix="/listings", tags=["listings"])
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "listings"
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_LISTING_IMAGES = 6
ALLOWED_IMAGE_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}


class ListingCreate(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=20, max_length=10000)
    city: str = Field(default="Kolkata", min_length=2, max_length=100)
    locality: str = Field(min_length=2, max_length=150)
    pincode: str | None = Field(default=None, pattern=r"^\d{6}$")
    flat_type: str = Field(min_length=2, max_length=20)
    available_beds: int = Field(default=1, ge=1, le=20)
    monthly_rent: int = Field(gt=0)
    security_deposit: int | None = Field(default=None, ge=0)
    is_furnished: bool = False
    brokerage: int = Field(default=0, ge=0)


class ListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=5, max_length=200)
    description: str | None = Field(default=None, min_length=20, max_length=10000)
    city: str | None = Field(default=None, min_length=2, max_length=100)
    locality: str | None = Field(default=None, min_length=2, max_length=150)
    pincode: str | None = Field(default=None, pattern=r"^\d{6}$")
    flat_type: str | None = Field(default=None, min_length=2, max_length=20)
    available_beds: int | None = Field(default=None, ge=1, le=20)
    monthly_rent: int | None = Field(default=None, gt=0)
    security_deposit: int | None = Field(default=None, ge=0)
    is_furnished: bool | None = None
    brokerage: int | None = Field(default=None, ge=0)
    status: ListingStatus | None = None


class InquiryCreate(BaseModel):
    message: str = Field(min_length=10, max_length=2000)
    share_phone: bool


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
    monthly_rent: int
    security_deposit: int | None
    is_furnished: bool
    brokerage: int
    status: ListingStatus
    owner_name: str
    created_at: datetime | None = None
    photo_urls: list[str] = Field(default_factory=list)
    photos: list[dict] = Field(default_factory=list)


def serialize(listing: Listing) -> dict:
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
        "monthly_rent": listing.monthly_rent,
        "security_deposit": listing.security_deposit,
        "is_furnished": listing.is_furnished,
        "brokerage": listing.brokerage,
        "status": listing.status,
        "owner_name": listing.owner.name,
        "created_at": listing.created_at,
        "photo_urls": [image.image_url for image in listing.images],
        "photos": [{"id": image.id, "image_url": image.image_url} for image in listing.images],
    }


@router.post("/{listing_id}/images", status_code=status.HTTP_201_CREATED)
async def upload_listing_images(
    listing_id: int,
    files: list[UploadFile] = File(...),
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

    validated = []
    for file in files:
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
        validated.append((filename, data))

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    created_paths = []
    try:
        for filename, data in validated:
            path = UPLOAD_DIR / filename
            path.write_bytes(data)
            created_paths.append(path)
            db.add(ListingImage(listing_id=listing_id, image_url=f"/uploads/listings/{filename}"))
        db.commit()
    except Exception:
        db.rollback()
        for path in created_paths:
            path.unlink(missing_ok=True)
        raise

    return {"photo_urls": [f"/uploads/listings/{filename}" for filename, _ in validated]}


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
    db.commit()
    db.refresh(inquiry)
    return {"id": inquiry.id, "message": "Your inquiry was sent to the lister."}


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
    return [
        {
            "id": inquiry.id,
            "listing_id": inquiry.listing_id,
            "listing_title": inquiry.listing.title,
            "sender_name": inquiry.sender.name,
            "sender_phone": inquiry.sender.phone if inquiry.phone_shared else None,
            "message": inquiry.message,
            "created_at": inquiry.created_at,
        }
        for inquiry in inquiries
    ]


@router.get("/{listing_id}/contact")
def get_listing_contact(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = (
        db.query(Listing)
        .options(joinedload(Listing.owner))
        .filter(Listing.id == listing_id, Listing.status == ListingStatus.ACTIVE)
        .first()
    )
    if listing is None:
        raise HTTPException(404, "Listing not found")
    if listing.user_id == user.id:
        raise HTTPException(400, "This is your listing")
    if not listing.owner.phone:
        raise HTTPException(404, "The lister has no verified phone number available")
    return {"owner_name": listing.owner.name, "phone": listing.owner.phone}


@router.post("", response_model=ListingOut, status_code=status.HTTP_201_CREATED)
def create_listing(
    data: ListingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = Listing(**data.model_dump(), user_id=user.id, status=ListingStatus.ACTIVE)
    db.add(listing)
    db.commit()
    db.refresh(listing)
    listing.owner = user
    return serialize(listing)


@router.get("", response_model=list[ListingOut])
def browse_listings(
    city: str | None = Query(default=None, min_length=2, max_length=100),
    flat_type: str | None = Query(default=None, min_length=2, max_length=20),
    locality: str | None = Query(default=None, min_length=2, max_length=150),
    min_rent: int | None = Query(default=None, ge=1),
    max_rent: int | None = Query(default=None, ge=1),
    min_beds: int | None = Query(default=None, ge=1, le=20),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Listing).options(joinedload(Listing.owner), selectinload(Listing.images)).filter(Listing.status == ListingStatus.ACTIVE)
    if city:
        query = query.filter(Listing.city.ilike(city.strip()))
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
    listings = query.order_by(Listing.created_at.desc()).offset(offset).limit(limit).all()
    return [serialize(item) for item in listings]

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
    return [serialize(listing) for listing in listings]

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
        )
        .order_by(SavedListing.created_at.desc())
        .all()
    )
    return [serialize(listing) for listing in listings]


@router.post("/{listing_id}/save")
def save_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id,
        Listing.status == ListingStatus.ACTIVE,
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
):
    listing = db.query(Listing).options(joinedload(Listing.owner), selectinload(Listing.images)).filter(Listing.id == listing_id).first()
    if listing is None or listing.status != ListingStatus.ACTIVE:
        raise HTTPException(404, "Listing not found")
    return serialize(listing)


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
    for key, value in updates.model_dump(exclude_unset=True).items():
        if value is None and key not in {"pincode", "security_deposit"}:
            raise HTTPException(422, f"{key} cannot be null")
        setattr(listing, key, value)
    db.commit()
    db.refresh(listing)
    return serialize(listing)


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

