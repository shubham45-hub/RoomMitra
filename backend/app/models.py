import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, Boolean, func, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class ListingStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    FILLED = "FILLED"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, default="RoomMitra user")
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(20), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    listings = relationship("Listing", back_populates="owner", cascade="all, delete-orphan")

class OtpChallenge(Base):
    __tablename__ = "otp_challenges"
    id = Column(Integer, primary_key=True)
    phone = Column(String(20), nullable=False, index=True)
    code_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    next_send_at = Column(DateTime(timezone=True), nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
    __table_args__ = (Index("ix_otp_challenges_phone_created", "phone", "created_at"),)

class Listing(Base):
    __tablename__ = "listings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    city = Column(String(100), default="Kolkata", nullable=False)
    locality = Column(String(150), nullable=False)
    pincode = Column(String(10), nullable=True)
    flat_type = Column(String(20), nullable=False)
    available_beds = Column(Integer, default=1, nullable=False)
    monthly_rent = Column(Integer, nullable=False)
    security_deposit = Column(Integer, nullable=True)
    is_furnished = Column(Boolean, default=False)
    brokerage = Column(Integer, default=0)
    status = Column(Enum(ListingStatus, name="listing_status"), default=ListingStatus.DRAFT, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    owner = relationship("User", back_populates="listings")
    images = relationship("ListingImage", back_populates="listing", cascade="all, delete-orphan", order_by="ListingImage.id")

class ListingImage(Base):
    __tablename__ = "listing_images"
    id = Column(Integer, primary_key=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    listing = relationship("Listing", back_populates="images")

class Locality(Base):
    __tablename__ = "localities"

    id = Column(Integer, primary_key=True)
    city = Column(String(100), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    source = Column(String(40), nullable=False, default="OpenStreetMap")

    __table_args__ = (
        UniqueConstraint("city", "name", name="uq_localities_city_name"),
    )

class SavedListing(Base):
    __tablename__ = "saved_listings"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    listing_id = Column(
        Integer,
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "listing_id", name="uq_saved_listing_user_listing"),
    )

class ListingInquiry(Base):
    __tablename__ = "listing_inquiries"

    id = Column(Integer, primary_key=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    phone_shared = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    listing = relationship("Listing")
    sender = relationship("User", foreign_keys=[sender_id])
    owner = relationship("User", foreign_keys=[owner_id])
