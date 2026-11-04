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
    preferred_city = Column(String(100), nullable=True)
    sex = Column(String(20), nullable=True)
    religion = Column(String(100), nullable=True)
    origin_state = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    phone = Column(String(20), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    listings = relationship("Listing", back_populates="owner", cascade="all, delete-orphan")

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
    occupants_count = Column(Integer, default=0, nullable=False, server_default="0")
    monthly_rent = Column(Integer, nullable=False)
    rent_basis = Column(String(20), nullable=False, default="PER_PERSON", server_default="PER_PERSON")
    security_deposit = Column(Integer, nullable=True)
    is_furnished = Column(Boolean, default=False)
    furnishing_status = Column(String(20), nullable=False, default="UNFURNISHED", server_default="UNFURNISHED")
    available_for = Column(String(20), nullable=False, default="ANY", server_default="ANY")
    brokerage = Column(Integer, default=0)
    status = Column(Enum(ListingStatus, name="listing_status"), default=ListingStatus.DRAFT, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    owner = relationship("User", back_populates="listings")
    images = relationship("ListingImage", back_populates="listing", cascade="all, delete-orphan", order_by="ListingImage.id")

class ListingImage(Base):
    __tablename__ = "listing_images"
    id = Column(Integer, primary_key=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    category = Column(String(20), nullable=False, default="OTHER", server_default="OTHER")
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
    read_at = Column(DateTime(timezone=True), nullable=True)
    listing = relationship("Listing")
    sender = relationship("User", foreign_keys=[sender_id])
    owner = relationship("User", foreign_keys=[owner_id])

class ListingReport(Base):
    __tablename__ = "listing_reports"
    id = Column(Integer, primary_key=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(String(40), nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="OPEN", server_default="OPEN")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    listing = relationship("Listing")
    reporter = relationship("User", foreign_keys=[reporter_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

class ListingView(Base):
    __tablename__ = "listing_views"
    id = Column(Integer, primary_key=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    viewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    last_viewed_at = Column(DateTime(timezone=True), nullable=False)
    __table_args__ = (
        UniqueConstraint("listing_id", "viewer_id", name="uq_listing_view_listing_viewer"),
        Index("ix_listing_views_listing_last_viewed", "listing_id", "last_viewed_at"),
    )

class ListingContact(Base):
    __tablename__ = "listing_contacts"
    id = Column(Integer, primary_key=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    first_contacted_at = Column(DateTime(timezone=True), nullable=False)
    last_contacted_at = Column(DateTime(timezone=True), nullable=False)
    __table_args__ = (
        UniqueConstraint("listing_id", "user_id", name="uq_listing_contact_listing_user"),
        Index("ix_listing_contacts_listing", "listing_id"),
    )

class ListingReaction(Base):
    __tablename__ = "listing_reactions"
    id = Column(Integer, primary_key=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reaction = Column(String(10), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    __table_args__ = (
        UniqueConstraint("listing_id", "user_id", name="uq_listing_reaction_listing_user"),
        Index("ix_listing_reactions_listing", "listing_id"),
    )
