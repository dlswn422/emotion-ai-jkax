from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime

from backend.db.session import get_db
from backend.db.models import GoogleReview
from backend.service.churn import calculate_churn_score, churn_level

router = APIRouter()


@router.get("/stores/{store_id}/customers")
def list_customers(store_id: str, db: Session = Depends(get_db)):
    """
    특정 매장의 리뷰를 기준으로 고객(리뷰 작성자) 목록 + 이탈 위험도 조회
    """

    rows = (
        db.query(
            GoogleReview.author_name.label("author_name"),
            func.count().label("review_count"),
            func.avg(GoogleReview.rating).label("avg_rating"),
            func.max(GoogleReview.created_at_google).label("last_review_at"),
            (
                func.sum(
                    case(
                        (GoogleReview.rating <= 2, 1),
                        else_=0,
                    )
                )
                / func.count()
            ).label("negative_ratio"),
        )
        .filter(GoogleReview.store_id == store_id)
        .group_by(GoogleReview.author_name)
        .all()
    )

    customers = []
    churn_scores = []

    for r in rows:
        score = calculate_churn_score(
            avg_rating=float(r.avg_rating),
            negative_ratio=float(r.negative_ratio),
            last_review_at=r.last_review_at,
        )

        churn_scores.append(score)

        customers.append(
            {
                "author_name": r.author_name,
                "review_count": r.review_count,
                "avg_rating": round(float(r.avg_rating), 1),
                "last_activity": r.last_review_at.date().isoformat(),
                "sentiment": (
                    "negative"
                    if r.negative_ratio >= 0.5
                    else "neutral"
                    if r.avg_rating < 4
                    else "positive"
                ),
                "churn_score": score,
                "churn_level": churn_level(score),
            }
        )

    total = len(customers)
    high_risk = sum(1 for c in customers if c["churn_level"] == "HIGH")

    avg_satisfaction = (
        round(sum(c["avg_rating"] for c in customers) / total, 1)
        if total > 0
        else 0
    )

    return {
        "total_customers": total,
        "high_risk": high_risk,
        "average_satisfaction": avg_satisfaction,
        "customers": customers,
    }
