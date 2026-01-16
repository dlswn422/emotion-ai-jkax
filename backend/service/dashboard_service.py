# backend/service/dashboard_service.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import Literal

from backend.db.models import GoogleReview


def get_rating_trend(
    *,
    db: Session,
    store_id: str,
    unit: Literal["day", "month"],
    from_date: date | None,
    to_date: date | None,
):
    """
    평점 추이 데이터 생성
    """

    # 📌 그룹 기준
    if unit == "day":
        group_col = func.date(GoogleReview.created_at_google)
    else:
        group_col = func.date_trunc("month", GoogleReview.created_at_google)

    query = (
        db.query(
            group_col.label("date"),
            func.avg(GoogleReview.rating).label("avg_rating"),
            func.count(GoogleReview.id).label("review_count"),
        )
        .filter(GoogleReview.store_id == store_id)
        .group_by(group_col)
        .order_by(group_col)
    )

    if from_date:
        query = query.filter(GoogleReview.created_at_google >= from_date)
    if to_date:
        query = query.filter(GoogleReview.created_at_google <= to_date)

    rows = query.all()

    # 🔥 highlight 계산
    result = []
    prev_rating = None

    for r in rows:
        avg_rating = round(float(r.avg_rating), 2)

        highlight = False
        if prev_rating is not None and abs(avg_rating - prev_rating) >= 0.3:
            highlight = True

        result.append(
            {
                "date": r.date.strftime("%Y-%m-%d")
                if unit == "day"
                else r.date.strftime("%Y-%m"),
                "avg_rating": avg_rating,
                "review_count": r.review_count,
                "highlight": highlight,
            }
        )

        prev_rating = avg_rating

    return result