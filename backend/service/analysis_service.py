from fastapi import UploadFile
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from backend.parser.file_parser import extract_reviews_from_file
from backend.analysis.basic_sentiment import analyze_basic_sentiment
from backend.analysis.cx_dashboard import analyze_cx_dashboard

from backend.db.models import GoogleReview


async def analyze_file_sentiment(file: UploadFile):
    reviews = await extract_reviews_from_file(file)
    return analyze_basic_sentiment(reviews)


def analyze_store_cx_by_period(
    store_id: str,
    from_date: str,
    to_date: str,
    db: Session,
):
    """
    1) DB에서 리뷰 조회
    2) 텍스트만 추출
    3) LLM 분석
    4) DB 기준 정량값(review_count, rating_distribution, rating) 고정 반환
    """

    start_dt, end_dt = _parse_date_range(from_date, to_date)

    reviews = (
        db.query(GoogleReview)
        .filter(
            GoogleReview.store_id == store_id,
            GoogleReview.created_at_google >= start_dt,
            GoogleReview.created_at_google < end_dt,
        )
        .order_by(GoogleReview.created_at_google.desc())
        .all()
    )

    print(f"reviews: {reviews}")

    review_texts = [
        r.comment
        for r in reviews
        if r.comment and len(r.comment.strip()) > 3
    ]

    rating_counter = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    rating_values: list[float] = []

    for r in reviews:
        if r.rating in rating_counter:
            rating_counter[r.rating] += 1
            rating_values.append(float(r.rating))

    review_count = len(reviews)

    rating_distribution = [
        {"stars": 5, "count": rating_counter[5]},
        {"stars": 4, "count": rating_counter[4]},
        {"stars": 3, "count": rating_counter[3]},
        {"stars": 2, "count": rating_counter[2]},
        {"stars": 1, "count": rating_counter[1]},
    ]

    average_rating = _compute_average_rating(rating_values)

    if not review_texts:
        return {
            "message": "분석할 리뷰가 없습니다.",
            "total": 0,
            "review_count": review_count,
            "rating": average_rating,
            "rating_distribution": rating_distribution,
        }

    llm_result = analyze_cx_dashboard(review_texts)

    return {
        **llm_result,
        "review_count": review_count,
        "rating_distribution": rating_distribution,
        "rating": average_rating,
    }


def _compute_average_rating(rating_values: list[float]) -> float:
    if not rating_values:
        return 0.0
    return round(sum(rating_values) / len(rating_values), 1)


def _parse_date_range(from_date: str, to_date: str):
    """
    프론트에서 받은 YYYY-MM-DD 기준
    [from 00:00:00, to 다음날 00:00:00) 범위 생성
    """
    start = datetime.fromisoformat(from_date).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
        tzinfo=timezone.utc,
    )

    end = (
        datetime.fromisoformat(to_date).replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
            tzinfo=timezone.utc,
        ) + timedelta(days=1)
    )

    return start, end