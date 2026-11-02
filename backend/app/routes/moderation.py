from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.models import Listing, ListingReport, ListingStatus, User
from app.services.security import get_current_user

router = APIRouter(prefix="/moderation", tags=["moderation"])
def require_moderator(user: User = Depends(get_current_user)) -> User:
    if not user.phone or user.phone not in settings.moderator_phones:
        raise HTTPException(status_code=403, detail="Moderator access is not enabled for this account")
    return user


class ReportReview(BaseModel):
    status: str = Field(pattern="^(OPEN|REVIEWING|RESOLVED|DISMISSED)$")
    pause_listing: bool = False


@router.get("/access")
def moderation_access(user: User = Depends(get_current_user)):
    return {"can_moderate": bool(user.phone and user.phone in settings.moderator_phones)}


@router.get("/reports")
def list_reports(
    status: str | None = Query(default=None, pattern="^(OPEN|REVIEWING|RESOLVED|DISMISSED)$"),
    db: Session = Depends(get_db),
    moderator: User = Depends(require_moderator),
):
    query = db.query(ListingReport).options(
        joinedload(ListingReport.listing), joinedload(ListingReport.reporter)
    )
    if status:
        query = query.filter(ListingReport.status == status)
    reports = query.order_by(ListingReport.created_at.desc()).limit(200).all()
    return [
        {
            "id": report.id,
            "listing_id": report.listing_id,
            "listing_title": report.listing.title,
            "listing_status": report.listing.status.value,
            "city": report.listing.city,
            "locality": report.listing.locality,
            "reporter_name": report.reporter.name,
            "reason": report.reason,
            "details": report.details,
            "status": report.status,
            "created_at": report.created_at,
            "reviewed_at": report.reviewed_at,
        }
        for report in reports
    ]


@router.patch("/reports/{report_id}")
def review_report(
    report_id: int,
    data: ReportReview,
    db: Session = Depends(get_db),
    moderator: User = Depends(require_moderator),
):
    report = db.query(ListingReport).filter(ListingReport.id == report_id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = data.status
    report.reviewed_at = datetime.now(timezone.utc)
    report.reviewed_by = moderator.id
    if data.pause_listing:
        listing = db.query(Listing).filter(Listing.id == report.listing_id).first()
        if listing and listing.status == ListingStatus.ACTIVE:
            listing.status = ListingStatus.PAUSED
    db.commit()
    return {"message": "Report updated", "status": report.status}
