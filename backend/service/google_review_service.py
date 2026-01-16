from sqlalchemy.orm import Session
from datetime import datetime, date, time

from backend.collectors.business_profile_client import (
    fetch_all_google_reviews,
)
from backend.db.models import GoogleReview


# =========================================================
# 🔥 기존 함수 (DB 저장 / 배치·수동 공용)
# =========================================================

def sync_google_reviews(store_id: str, tenant_id: int, db: Session):
    existing_review_ids = {
        r.google_review_id
        for r in db.query(GoogleReview.google_review_id)
        .filter(
            GoogleReview.store_id == store_id,
            GoogleReview.tenant_id == tenant_id,
        )
        .all()
    }

    raw_reviews = fetch_all_google_reviews(store_id)

    new_reviews = []

    for r in raw_reviews:
        review_id = r.get("reviewId")
        if not review_id or review_id in existing_review_ids:
            continue

        new_reviews.append(
            GoogleReview(
                tenant_id=tenant_id,
                store_id=store_id,
                google_review_id=review_id,
                author_name=r.get("reviewer", {}).get("displayName"),
                rating=_convert_rating(r.get("starRating")),
                comment=r.get("comment"),
                created_at_google=_parse_datetime(r.get("createTime")),
                updated_at_google=_parse_datetime(r.get("updateTime")),
            )
        )

    if new_reviews:
        db.bulk_save_objects(new_reviews)
        db.commit()

    return {
        "total_fetched": len(raw_reviews),
        "inserted": len(new_reviews),
        "skipped": len(raw_reviews) - len(new_reviews),
    }


# =========================================================
# ✅ 신규 함수 ①
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
# ✅ 신규 함수 ②
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


# =========================================================
# 내부 헬퍼 함수
# =========================================================

def _parse_datetime(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", ""))
    except Exception:
        return None


def _convert_rating(value):
    if isinstance(value, int):
        return value

    rating_map = {
        "ONE": 1,
        "TWO": 2,
        "THREE": 3,
        "FOUR": 4,
        "FIVE": 5,
    }
    return rating_map.get(value)