from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Listing, ListingStatus

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/suggestions")
def suggest_localities(
    city: str = Query(min_length=2, max_length=100),
    q: str = Query(min_length=1, max_length=80),
    db: Session = Depends(get_db),
):
    places = (
        db.query(Listing.locality)
        .filter(
            Listing.status == ListingStatus.ACTIVE,
            Listing.city.ilike(city.strip()),
            Listing.locality.ilike(f"{q.strip()}%"),
        )
        .distinct()
        .order_by(Listing.locality)
        .limit(8)
        .all()
    )

    return {"suggestions": [place[0] for place in places]}