# backend/api/dashboard.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Literal

from backend.db.session import get_db
from backend.service.dashboard_service import get_rating_trend

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/rating-trend")
def rating_trend(
    store_id: str = Query(..., description="Google store_id"),
    unit: Literal["day", "month"] = Query("day"),
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    """
    평점 추이 API
    """
    return get_rating_trend(
        db=db,
        store_id=store_id,
        unit=unit,
        from_date=from_date,
        to_date=to_date,
    )
