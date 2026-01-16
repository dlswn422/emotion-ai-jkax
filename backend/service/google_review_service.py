from sqlalchemy.orm import Session
from datetime import datetime, date, time
from typing import Dict

from backend.collectors.business_profile_client import (
    fetch_all_google_reviews,
)
from backend.db.models import GoogleReview


# =========================================================
# DB 저장 / 배치·수동 공용
# =========================================================
def sync_all_reviews_for_user(
    *,
    user_id: int,
    db: Session,
) -> Dict[str, int]:
    """
    로그인한 유저의 Google 계정 기준
    모든 매장의 리뷰를 DB에 저장
    """

    reviews = fetch_all_google_reviews(
        user_id=user_id,
        db=db,
    )

    saved = 0
    skipped = 0

    for r in reviews:
        review_id = r["name"]  # Google review resource name

        exists = (
            db.query(GoogleReview)
            .filter(GoogleReview.review_id == review_id)
            .first()
        )

        if exists:
            skipped += 1
            continue

        review = GoogleReview(
            review_id=review_id,
            store_id=r["name"].split("/reviews/")[0],
            rating=r.get("starRating"),
            comment=r.get("comment"),
            create_time=r.get("createTime"),
        )

        db.add(review)
        saved += 1

    db.commit()

    return {
        "total_fetched": len(reviews),
        "saved": saved,
        "skipped": skipped,
    }


# =========================================================
# 기간 + 매장 + 테넌트 기준 리뷰 조회 (대시보드 공용)
# =========================================================

def get_google_reviews_by_period(
    db: Session,
    tenant_id: int,
    store_id: str,
    start_date: date,
    end_date: date,
):
    start_dt = datetime.combine(start_date, time.min)
    end_dt = datetime.combine(end_date, time.max)

    return (
        db.query(GoogleReview)
        .filter(GoogleReview.tenant_id == tenant_id)
        .filter(GoogleReview.store_id == store_id)
        .filter(GoogleReview.created_at_google >= start_dt)
        .filter(GoogleReview.created_at_google <= end_dt)
        .order_by(GoogleReview.created_at_google.asc())
        .all()
    )


# =========================================================
# 날짜별 평점 추이 (그래프용)
# =========================================================
def get_rating_trend_by_period(
    db: Session,
    tenant_id: int,
    store_id: str,
    start_date: date,
    end_date: date,
):
    from sqlalchemy import func

    start_dt = datetime.combine(start_date, time.min)
    end_dt = datetime.combine(end_date, time.max)

    rows = (
        db.query(
            func.date(GoogleReview.created_at_google).label("date"),
            func.avg(GoogleReview.rating).label("avg_rating"),
            func.count().label("count"),
        )
        .filter(GoogleReview.tenant_id == tenant_id)
        .filter(GoogleReview.store_id == store_id)
        .filter(GoogleReview.created_at_google >= start_dt)
        .filter(GoogleReview.created_at_google <= end_dt)
        .group_by(func.date(GoogleReview.created_at_google))
        .order_by(func.date(GoogleReview.created_at_google))
        .all()
    )

    return [
        {
            "date": r.date,
            "avg_rating": round(float(r.avg_rating), 2),
            "count": r.count,
        }
        for r in rows
    ]


