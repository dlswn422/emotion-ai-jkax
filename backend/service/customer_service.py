from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from backend.db.models import GoogleReview


"""
Customer analytics response contract

{
  "summary": {
    "total_customers": { "current": 44, "previous": 42, "delta_pct": 4.2 },
    "at_risk_customers": { "current": 16, "previous": 15, "delta_pct": 6.7 },
    "avg_satisfaction": { "current": 3.2, "previous": 2.9, "delta_value": 0.3 },
    "repeat_visit_rate": { "current": 62, "previous": 59, "delta_pct": 3.0 }
  },
  "risk_distribution": {
    "high": { "count": 16, "pct": 36.4, "avg_churn_pct": 88 },
    "medium": { "count": 7, "pct": 15.9 },
    "low": { "count": 21, "pct": 47.7 }
  },
  "visit_frequency_distribution": {
    "weekly_plus": 18,
    "monthly_2": 28,
    "monthly_1": 24,
    "occasional": 16,
    "first_visit": 14,
    "repeat_intent_rate": 78
  },
  "segments": {
    "loyal": { "count": 0, "share_pct": 0, "avg_rating": 4.8 },
    "new": { "count": 28, "share_pct": 64, "avg_rating": 3.6, "conversion_rate": 42 },
    "at_risk": { "count": 16, "share_pct": 36, "avg_rating": 1.8, "churn_probability": 82 },
    "reactivation": { "count": 7, "share_pct": 16, "avg_rating": 3.0, "reactivation_probability": 58 },
    "insights": []
  },
  "cohort": {
    "rows": [],
    "summary_text": ""
  },
  "customers": []
}
"""


# ----------------------------
# datetime helpers
# ----------------------------
def _to_naive_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _safe_sort_dt(dt: datetime | None) -> datetime:
    return _to_naive_utc(dt) or datetime.min


# ----------------------------
# public service
# ----------------------------
def get_store_customers_by_period(
    db: Session,
    store_id: str,
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict:
    """
    고객 분석 API 응답 생성
    - LLM 없음
    - DB 리뷰 집계 기반
    - 현재 기간 vs 직전 동일 길이 기간 비교
    """

    current_start, current_end_exclusive = _parse_date_range(from_date, to_date)
    period_days = max((current_end_exclusive - current_start).days, 1)

    previous_end_exclusive = current_start
    previous_start = previous_end_exclusive - timedelta(days=period_days)

    current_reviews = _fetch_reviews(
        db=db,
        store_id=store_id,
        start_dt=current_start,
        end_dt_exclusive=current_end_exclusive,
    )
    previous_reviews = _fetch_reviews(
        db=db,
        store_id=store_id,
        start_dt=previous_start,
        end_dt_exclusive=previous_end_exclusive,
    )
    all_reviews = _fetch_reviews_all(db=db, store_id=store_id)

    current_customer_map = _group_reviews_by_customer(current_reviews)
    previous_customer_map = _group_reviews_by_customer(previous_reviews)
    all_customer_map = _group_reviews_by_customer(all_reviews)

    current_customers = _build_customer_metrics(
        customer_map=current_customer_map,
        all_customer_map=all_customer_map,
        now_dt=current_end_exclusive,
    )
    previous_customers = _build_customer_metrics(
        customer_map=previous_customer_map,
        all_customer_map=all_customer_map,
        now_dt=previous_end_exclusive,
    )

    summary = _build_summary(
        current_customers=current_customers,
        previous_customers=previous_customers,
        current_reviews=current_reviews,
        previous_reviews=previous_reviews,
    )

    risk_distribution = _build_risk_distribution(current_customers)
    visit_frequency_distribution = _build_visit_frequency_distribution(current_customers)
    segments = _build_segments(current_customers)
    cohort = _build_cohort(all_customer_map, current_start, current_end_exclusive)
    customers = _build_customer_list(current_customers)

    return {
        "summary": summary,
        "risk_distribution": risk_distribution,
        "visit_frequency_distribution": visit_frequency_distribution,
        "segments": segments,
        "cohort": cohort,
        "customers": customers,
    }


# ----------------------------
# query helpers
# ----------------------------
def _fetch_reviews(
    db: Session,
    store_id: str,
    start_dt: datetime,
    end_dt_exclusive: datetime,
) -> list[GoogleReview]:
    return (
        db.query(GoogleReview)
        .filter(GoogleReview.store_id == store_id)
        .filter(GoogleReview.created_at_google >= start_dt)
        .filter(GoogleReview.created_at_google < end_dt_exclusive)
        .order_by(GoogleReview.created_at_google.asc())
        .all()
    )


def _fetch_reviews_all(
    db: Session,
    store_id: str,
) -> list[GoogleReview]:
    return (
        db.query(GoogleReview)
        .filter(GoogleReview.store_id == store_id)
        .order_by(GoogleReview.created_at_google.asc())
        .all()
    )


# ----------------------------
# parsing helpers
# ----------------------------
def _parse_date_range(
    from_date: str | None,
    to_date: str | None,
) -> tuple[datetime, datetime]:
    """
    반환값:
      start_dt (inclusive)
      end_dt_exclusive
    """
    today = datetime.now()

    if from_date:
        start_dt = datetime.strptime(from_date, "%Y-%m-%d")
    else:
        start_dt = today - timedelta(days=90)

    if to_date:
        end_dt = datetime.strptime(to_date, "%Y-%m-%d")
    else:
        end_dt = today

    end_dt_exclusive = end_dt + timedelta(days=1)

    if end_dt_exclusive <= start_dt:
        end_dt_exclusive = start_dt + timedelta(days=1)

    return start_dt, end_dt_exclusive


# ----------------------------
# customer grouping
# ----------------------------
def _group_reviews_by_customer(
    reviews: list[GoogleReview],
) -> dict[str, list[GoogleReview]]:
    grouped: dict[str, list[GoogleReview]] = defaultdict(list)

    for review in reviews:
        name = _extract_customer_name(review)
        grouped[name].append(review)

    return grouped


def _extract_customer_name(review: GoogleReview) -> str:
    """
    GoogleReview 모델의 고객명 컬럼명이 환경마다 다를 수 있어서
    후보 필드를 순서대로 탐색.
    """
    candidates = [
        "author_name",
        "reviewer_name",
        "reviewer_display_name",
        "user_name",
        "customer_name",
        "reviewer",
        "author",
        "name",
    ]

    for field in candidates:
        value = getattr(review, field, None)
        if isinstance(value, str) and value.strip():
            return value.strip()

    return "익명 고객"


def _extract_review_datetime(review: GoogleReview) -> datetime | None:
    candidates = [
        "created_at_google",
        "create_time",
        "created_at",
    ]
    for field in candidates:
        value = getattr(review, field, None)
        if isinstance(value, datetime):
            return value
    return None


# ----------------------------
# customer metric builders
# ----------------------------
def _build_customer_metrics(
    customer_map: dict[str, list[GoogleReview]],
    all_customer_map: dict[str, list[GoogleReview]],
    now_dt: datetime,
) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []

    now_dt = _to_naive_utc(now_dt) or datetime.min

    for customer_name, reviews in customer_map.items():
        reviews_sorted = sorted(
            reviews,
            key=lambda r: _safe_sort_dt(_extract_review_datetime(r)),
        )
        all_reviews_sorted = sorted(
            all_customer_map.get(customer_name, []),
            key=lambda r: _safe_sort_dt(_extract_review_datetime(r)),
        )

        ratings = [float(r.rating) for r in reviews_sorted if r.rating is not None]
        avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else 0.0

        last_dt = _extract_review_datetime(reviews_sorted[-1]) if reviews_sorted else None
        first_all_dt = _extract_review_datetime(all_reviews_sorted[0]) if all_reviews_sorted else None

        last_dt = _to_naive_utc(last_dt)
        first_all_dt = _to_naive_utc(first_all_dt)

        visit_count_current = len(reviews_sorted)
        visit_count_all = len(all_reviews_sorted)

        days_since_last = (
            max((now_dt - last_dt).days, 0)
            if last_dt
            else 999
        )

        is_repeat_customer = visit_count_all >= 2
        is_first_visit_customer = visit_count_all == 1

        visit_frequency_label = _classify_visit_frequency(
            visit_count=visit_count_current,
            first_visit_customer=is_first_visit_customer,
        )

        churn_score = _calculate_churn_score(
            avg_rating=avg_rating,
            visit_count_all=visit_count_all,
            days_since_last=days_since_last,
        )
        churn_level = _classify_risk(churn_score)

        sentiment = _rating_to_sentiment(avg_rating)

        result.append(
            {
                "author_name": customer_name,
                "review_count": visit_count_current,
                "total_review_count_all_time": visit_count_all,
                "avg_rating": avg_rating,
                "last_activity_dt": last_dt,
                "last_activity": last_dt.strftime("%Y-%m-%d") if last_dt else None,
                "first_visit_dt": first_all_dt,
                "sentiment": sentiment,
                "churn_score": churn_score,
                "churn_level": churn_level,
                "visit_frequency_label": visit_frequency_label,
                "is_repeat_customer": is_repeat_customer,
                "is_first_visit_customer": is_first_visit_customer,
            }
        )

    return result


def _classify_visit_frequency(
    visit_count: int,
    first_visit_customer: bool,
) -> str:
    if first_visit_customer and visit_count <= 1:
        return "첫 방문"
    if visit_count >= 4:
        return "주 1회+"
    if visit_count >= 2:
        return "월 2회"
    if visit_count == 1:
        return "월 1회"
    return "가끔"


def _calculate_churn_score(
    avg_rating: float,
    visit_count_all: int,
    days_since_last: int,
) -> int:
    score = 0

    if avg_rating <= 2.0:
        score += 45
    elif avg_rating <= 3.0:
        score += 30
    elif avg_rating <= 4.0:
        score += 15

    if visit_count_all <= 1:
        score += 20
    elif visit_count_all == 2:
        score += 10

    if days_since_last >= 90:
        score += 35
    elif days_since_last >= 45:
        score += 20
    elif days_since_last >= 20:
        score += 10

    return max(0, min(score, 100))


def _classify_risk(churn_score: int) -> str:
    if churn_score >= 70:
        return "HIGH"
    if churn_score >= 40:
        return "MEDIUM"
    return "LOW"


def _rating_to_sentiment(avg_rating: float) -> str:
    if avg_rating >= 4.0:
        return "positive"
    if avg_rating >= 3.0:
        return "neutral"
    return "negative"


# ----------------------------
# summary
# ----------------------------
def _build_summary(
    current_customers: list[dict[str, Any]],
    previous_customers: list[dict[str, Any]],
    current_reviews: list[GoogleReview],
    previous_reviews: list[GoogleReview],
) -> dict:
    current_total_customers = len(current_customers)
    previous_total_customers = len(previous_customers)

    current_at_risk = sum(1 for c in current_customers if c["churn_level"] == "HIGH")
    previous_at_risk = sum(1 for c in previous_customers if c["churn_level"] == "HIGH")

    current_avg_satisfaction = _avg_rating_from_reviews(current_reviews)
    previous_avg_satisfaction = _avg_rating_from_reviews(previous_reviews)

    current_repeat_visit_rate = _repeat_visit_rate(current_customers)
    previous_repeat_visit_rate = _repeat_visit_rate(previous_customers)

    return {
        "total_customers": {
            "current": current_total_customers,
            "previous": previous_total_customers,
            "delta_pct": _delta_pct(current_total_customers, previous_total_customers),
        },
        "at_risk_customers": {
            "current": current_at_risk,
            "previous": previous_at_risk,
            "delta_pct": _delta_pct(current_at_risk, previous_at_risk),
        },
        "avg_satisfaction": {
            "current": current_avg_satisfaction,
            "previous": previous_avg_satisfaction,
            "delta_value": round(current_avg_satisfaction - previous_avg_satisfaction, 1),
        },
        "repeat_visit_rate": {
            "current": current_repeat_visit_rate,
            "previous": previous_repeat_visit_rate,
            "delta_pct": round(current_repeat_visit_rate - previous_repeat_visit_rate, 1),
        },
    }


def _avg_rating_from_reviews(reviews: list[GoogleReview]) -> float:
    ratings = [float(r.rating) for r in reviews if r.rating is not None]
    if not ratings:
        return 0.0
    return round(sum(ratings) / len(ratings), 1)


def _repeat_visit_rate(customers: list[dict[str, Any]]) -> float:
    total = len(customers)
    if total == 0:
        return 0.0
    repeat_count = sum(1 for c in customers if c["is_repeat_customer"])
    return round((repeat_count / total) * 100, 1)


def _delta_pct(current: float, previous: float) -> float:
    if previous == 0:
        if current == 0:
            return 0.0
        return 100.0
    return round(((current - previous) / previous) * 100, 1)


# ----------------------------
# risk distribution
# ----------------------------
def _build_risk_distribution(
    customers: list[dict[str, Any]],
) -> dict:
    total = len(customers) or 1

    high = [c for c in customers if c["churn_level"] == "HIGH"]
    medium = [c for c in customers if c["churn_level"] == "MEDIUM"]
    low = [c for c in customers if c["churn_level"] == "LOW"]

    high_avg_churn = (
        round(sum(c["churn_score"] for c in high) / len(high), 1)
        if high
        else 0
    )

    return {
        "high": {
            "count": len(high),
            "pct": round(len(high) / total * 100, 1),
            "avg_churn_pct": high_avg_churn,
        },
        "medium": {
            "count": len(medium),
            "pct": round(len(medium) / total * 100, 1),
        },
        "low": {
            "count": len(low),
            "pct": round(len(low) / total * 100, 1),
        },
    }


# ----------------------------
# visit frequency distribution
# ----------------------------
def _build_visit_frequency_distribution(
    customers: list[dict[str, Any]],
) -> dict:
    total = len(customers) or 1

    buckets = {
        "weekly_plus": 0,
        "monthly_2": 0,
        "monthly_1": 0,
        "occasional": 0,
        "first_visit": 0,
    }

    for customer in customers:
        label = customer["visit_frequency_label"]
        if label == "주 1회+":
            buckets["weekly_plus"] += 1
        elif label == "월 2회":
            buckets["monthly_2"] += 1
        elif label == "월 1회":
            buckets["monthly_1"] += 1
        elif label == "첫 방문":
            buckets["first_visit"] += 1
        else:
            buckets["occasional"] += 1

    repeat_intent_rate = _repeat_visit_rate(customers)

    return {
        "weekly_plus": round(buckets["weekly_plus"] / total * 100, 1),
        "monthly_2": round(buckets["monthly_2"] / total * 100, 1),
        "monthly_1": round(buckets["monthly_1"] / total * 100, 1),
        "occasional": round(buckets["occasional"] / total * 100, 1),
        "first_visit": round(buckets["first_visit"] / total * 100, 1),
        "repeat_intent_rate": repeat_intent_rate,
    }


# ----------------------------
# segments
# ----------------------------
def _build_segments(
    customers: list[dict[str, Any]],
) -> dict:
    total = len(customers) or 1

    loyal = [
        c for c in customers
        if c["total_review_count_all_time"] >= 3 and c["churn_level"] == "LOW"
    ]
    new = [c for c in customers if c["is_first_visit_customer"]]
    at_risk = [c for c in customers if c["churn_level"] == "HIGH"]
    reactivation = [c for c in customers if c["churn_level"] == "MEDIUM"]

    def avg_rating(rows: list[dict[str, Any]]) -> float:
        if not rows:
            return 0.0
        return round(sum(r["avg_rating"] for r in rows) / len(rows), 1)

    def share(rows: list[dict[str, Any]]) -> float:
        return round(len(rows) / total * 100, 1)

    def avg_churn(rows: list[dict[str, Any]]) -> float:
        if not rows:
            return 0.0
        return round(sum(r["churn_score"] for r in rows) / len(rows), 1)

    loyal_count = len(loyal)
    new_count = len(new)
    at_risk_count = len(at_risk)
    reactivation_count = len(reactivation)

    insights: list[str] = []
    if new_count > 0:
        insights.append(f"신규 고객 비중이 {share(new)}%로 가장 큰 유입 그룹입니다.")
    if at_risk_count > 0:
        insights.append(f"이탈 위험 고객이 {at_risk_count}명으로 빠른 대응이 필요합니다.")

    return {
        "loyal": {
            "count": loyal_count,
            "share_pct": share(loyal),
            "avg_rating": avg_rating(loyal),
        },
        "new": {
            "count": new_count,
            "share_pct": share(new),
            "avg_rating": avg_rating(new),
            "conversion_rate": round(_repeat_visit_rate(new), 1),
        },
        "at_risk": {
            "count": at_risk_count,
            "share_pct": share(at_risk),
            "avg_rating": avg_rating(at_risk),
            "churn_probability": avg_churn(at_risk),
        },
        "reactivation": {
            "count": reactivation_count,
            "share_pct": share(reactivation),
            "avg_rating": avg_rating(reactivation),
            "reactivation_probability": max(0.0, round(100 - avg_churn(reactivation), 1)),
        },
        "insights": insights,
    }


# ----------------------------
# cohort
# ----------------------------
def _build_cohort(
    all_customer_map: dict[str, list[GoogleReview]],
    current_start: datetime,
    current_end_exclusive: datetime,
) -> dict:
    """
    현재 화면 구간까지의 고객 이력을 바탕으로
    코호트 월 / 이후 재방문율 계산
    """
    current_end_exclusive = _to_naive_utc(current_end_exclusive) or datetime.max
    cohort_buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for customer_name, reviews in all_customer_map.items():
        review_dates = sorted(
            [
                safe_dt
                for safe_dt in (
                    _to_naive_utc(_extract_review_datetime(r)) for r in reviews
                )
                if safe_dt is not None and safe_dt < current_end_exclusive
            ]
        )
        if not review_dates:
            continue

        first_dt = review_dates[0]
        cohort_key = first_dt.strftime("%Y.%m")

        month_set = {(d.year, d.month) for d in review_dates}
        cohort_buckets[cohort_key].append(
            {
                "customer_name": customer_name,
                "first_dt": first_dt,
                "month_set": month_set,
            }
        )

    sorted_keys = sorted(cohort_buckets.keys())
    rows: list[dict[str, Any]] = []

    best_month = None
    best_m1 = -1.0

    for cohort_key in sorted_keys:
        members = cohort_buckets[cohort_key]
        size = len(members)

        row = {
            "cohort": cohort_key,
            "size": size,
            "m1": _cohort_retention_from_key(members, cohort_key, 1),
            "m2": _cohort_retention_from_key(members, cohort_key, 2),
            "m3": _cohort_retention_from_key(members, cohort_key, 3),
            "m4": _cohort_retention_from_key(members, cohort_key, 4),
            "m5": _cohort_retention_from_key(members, cohort_key, 5),
        }
        rows.append(row)

        m1 = row["m1"]
        if m1 is not None and m1 > best_m1:
            best_m1 = m1
            best_month = cohort_key

    summary_text = (
        f"{best_month} 코호트가 M+1 재방문율 {best_m1}%로 가장 높습니다."
        if best_month is not None and best_m1 >= 0
        else "코호트 요약이 없습니다."
    )

    return {
        "rows": rows,
        "summary_text": summary_text,
    }


def _cohort_retention_from_key(
    members: list[dict[str, Any]],
    cohort_key: str,
    offset: int,
) -> float | None:
    cohort_year, cohort_month = map(int, cohort_key.split("."))
    return _cohort_retention(members, cohort_year, cohort_month, offset)


def _cohort_retention(
    members: list[dict[str, Any]],
    cohort_year: int,
    cohort_month: int,
    offset: int,
) -> float | None:
    target_year, target_month = _add_months(cohort_year, cohort_month, offset)

    eligible = len(members)
    if eligible == 0:
        return None

    retained = 0
    for member in members:
        if (target_year, target_month) in member["month_set"]:
            retained += 1

    return round(retained / eligible * 100, 1)


def _add_months(year: int, month: int, offset: int) -> tuple[int, int]:
    total = (year * 12 + (month - 1)) + offset
    new_year = total // 12
    new_month = total % 12 + 1
    return new_year, new_month


# ----------------------------
# customer list
# ----------------------------
def _build_customer_list(
    customers: list[dict[str, Any]],
) -> list[dict]:
    result = []

    for customer in customers:
        result.append(
            {
                "author_name": customer["author_name"],
                "review_count": customer["review_count"],
                "avg_rating": customer["avg_rating"],
                "last_activity": customer["last_activity"],
                "sentiment": customer["sentiment"],
                "churn_score": customer["churn_score"],
                "churn_level": customer["churn_level"],
                "visit_frequency_label": customer["visit_frequency_label"],
                "avg_spend": None,
                "tags": _build_tags(customer),
            }
        )

    return sorted(
        result,
        key=lambda x: (x["churn_score"], x["avg_rating"]),
        reverse=True,
    )


def _build_tags(customer: dict[str, Any]) -> list[str]:
    tags: list[str] = []

    if customer["sentiment"] == "positive":
        tags.append("긍정 리뷰")
    elif customer["sentiment"] == "negative":
        tags.append("부정 리뷰")
    else:
        tags.append("중립 리뷰")

    if customer["churn_level"] == "HIGH":
        tags.append("이탈 위험")
    if customer["total_review_count_all_time"] >= 3:
        tags.append("반복 방문")
    if customer["avg_rating"] >= 4:
        tags.append("고평점")

    return tags or ["리뷰 고객"]