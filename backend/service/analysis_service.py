from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import UploadFile
from sqlalchemy.orm import Session

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
    5) 평점 추이(day/month)도 함께 반환
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

    rating_trend_daily = _build_rating_trend_from_reviews(reviews, unit="day")
    rating_trend_monthly = _build_rating_trend_from_reviews(reviews, unit="month")

    # 리뷰 텍스트가 없으면 에러가 아니라 "빈 payload" 반환
    if not review_texts:
        return _build_empty_cx_payload(
            review_count=review_count,
            rating=average_rating,
            rating_distribution=rating_distribution,
            rating_trend_daily=rating_trend_daily,
            rating_trend_monthly=rating_trend_monthly,
        )

    llm_result = analyze_cx_dashboard(review_texts)

    # LLM 결과가 비정상/빈 dict여도 최소 payload는 유지
    if not isinstance(llm_result, dict):
        llm_result = {}

    payload = {
        **llm_result,
        "review_count": review_count,
        "rating_distribution": rating_distribution,
        "rating": average_rating,
        "rating_trend_daily": rating_trend_daily,
        "rating_trend_monthly": rating_trend_monthly,
    }

    # 누락 필드 최소 보강
    payload.setdefault("executive_summary", "")
    payload.setdefault("drivers_of_satisfaction", [])
    payload.setdefault("areas_for_improvement", [])
    payload.setdefault("positive_keywords", [])
    payload.setdefault("negative_keywords", [])
    payload.setdefault("neutral_keywords", [])
    payload.setdefault("all_keywords", [])
    payload.setdefault("strategic_insights", [])
    payload.setdefault("action_plan", [])
    payload.setdefault(
        "kpi",
        {
            "sentiment": {
                "positive": 0,
                "neutral": 0,
                "negative": 0,
            },
            "nps": 0,
        },
    )

    return payload


def _build_empty_cx_payload(
    *,
    review_count: int,
    rating: float,
    rating_distribution: list[dict[str, Any]],
    rating_trend_daily: list[dict[str, Any]],
    rating_trend_monthly: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    리뷰가 없거나 분석 가능한 텍스트가 없을 때도
    프론트가 그대로 렌더링 가능한 빈 payload를 반환
    """
    return {
        "message": "분석할 리뷰가 없습니다.",
        "executive_summary": "",
        "review_count": review_count,
        "rating": rating,
        "rating_distribution": rating_distribution,
        "rating_trend_daily": rating_trend_daily,
        "rating_trend_monthly": rating_trend_monthly,
        "kpi": {
            "sentiment": {
                "positive": 0,
                "neutral": 0,
                "negative": 0,
            },
            "nps": 0,
        },
        "drivers_of_satisfaction": [],
        "areas_for_improvement": [],
        "positive_keywords": [],
        "negative_keywords": [],
        "neutral_keywords": [],
        "all_keywords": [],
        "strategic_insights": [],
        "action_plan": [],
    }


def _build_rating_trend_from_reviews(
    reviews: list[GoogleReview],
    unit: str,
) -> list[dict[str, Any]]:
    grouped: dict[str, list[float]] = defaultdict(list)

    for review in reviews:
        if review.rating is None or review.created_at_google is None:
            continue

        dt = review.created_at_google

        if unit == "day":
            key = dt.strftime("%Y-%m-%d")
        else:
            key = dt.strftime("%Y-%m")

        grouped[key].append(float(review.rating))

    keys = sorted(grouped.keys())
    result: list[dict[str, Any]] = []

    prev_rating: float | None = None

    for key in keys:
        ratings = grouped[key]
        avg_rating = round(sum(ratings) / len(ratings), 2)

        highlight = False
        if prev_rating is not None and abs(avg_rating - prev_rating) >= 0.3:
            highlight = True

        result.append(
            {
                "date": key,
                "avg_rating": avg_rating,
                "review_count": len(ratings),
                "highlight": highlight,
            }
        )

        prev_rating = avg_rating

    return result


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