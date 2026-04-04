from __future__ import annotations

from calendar import monthrange
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from backend.db.models import GoogleReview
from backend.service.churn import calculate_churn_score, churn_level as calculate_churn_level


"""
Customer analytics response contract

이 서비스가 최종적으로 프론트에 내려주는 JSON 응답 구조 예시.
summary / risk_distribution / 방문빈도 / 세그먼트 / 코호트 / 고객목록을 한 번에 만든다.
"""
# {
#   "summary": {
#     "total_customers": { "current": 44, "previous": 42, "delta_pct": 4.2 },
#     "at_risk_customers": { "current": 16, "previous": 15, "delta_pct": 6.7 },
#     "avg_satisfaction": { "current": 3.2, "previous": 2.9, "delta_value": 0.3 },
#     "repeat_visit_rate": { "current": 62, "previous": 59, "delta_pct": 3.0 }
#   },
#   "risk_distribution": {
#     "high": { "count": 16, "pct": 36.4, "avg_churn_pct": 88 },
#     "medium": { "count": 7, "pct": 15.9 },
#     "low": { "count": 21, "pct": 47.7 }
#   },
#   "visit_frequency_distribution": {
#     "weekly_plus": 18,
#     "monthly_2": 28,
#     "monthly_1": 24,
#     "occasional": 16,
#     "first_visit": 14,
#     "repeat_intent_rate": 78
#   },
#   "segments": {
#     "loyal": { "count": 0, "share_pct": 0, "avg_rating": 4.8 },
#     "new": { "count": 28, "share_pct": 64, "avg_rating": 3.6, "conversion_rate": 42 },
#     "at_risk": { "count": 16, "share_pct": 36, "avg_rating": 1.8, "churn_probability": 82 },
#     "reactivation": { "count": 7, "share_pct": 16, "avg_rating": 3.0, "reactivation_probability": 58 },
#     "insights": []
#   },
#   "cohort": {
#     "rows": [],
#     "summary_text": ""
#   },
#   "customers": []
# }


# ----------------------------
# datetime helpers
# ----------------------------
def _to_naive_utc(dt: datetime | None) -> datetime | None:
    """
    datetime을 'UTC 기준의 timezone 없는 datetime'으로 통일한다.

    왜 필요하냐면:
    - DB에서 timezone 있는 datetime / 없는 datetime이 섞여 들어올 수 있음
    - Python에서 둘을 바로 빼거나 정렬하면 오류가 날 수 있음

    처리 방식:
    - None이면 그대로 None 반환
    - timezone 정보가 있으면 UTC로 변환 후 tzinfo 제거
    - 이미 naive datetime이면 그대로 반환
    """
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _safe_sort_dt(dt: datetime | None) -> datetime:
    """
    정렬용 안전 래퍼 함수.

    리뷰 날짜가 없는 경우(None)도 있을 수 있어서,
    그럴 때는 datetime.min(가장 과거 날짜)로 처리해서 정렬이 깨지지 않게 한다.
    """
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
    고객 분석 API의 최종 응답을 만드는 메인 서비스 함수.

    이 함수의 전체 흐름:
    1) from_date / to_date를 보고 '현재월'과 '전달' 범위를 계산
    2) 현재월 리뷰 / 전달 리뷰 / 전체 리뷰를 DB에서 조회
    3) 리뷰를 고객명 기준으로 묶음
    4) 고객별 지표(평균 평점, 이탈점수, 방문빈도 등)를 계산
    5) 요약 카드 / 리스크 분포 / 방문빈도 분포 / 세그먼트 / 코호트 / 고객목록 생성
    6) 프론트가 바로 쓸 수 있는 dict로 반환

    중요한 점:
    - LLM 안 씀
    - 전부 DB 리뷰 집계 기반
    - 비교 기준은 '현재월 vs 전달'
    - 이탈위험 계산은 churn.py를 사용
      -> 평균 평점 / 부정 리뷰 비율 / 최근 활동 공백을 종합해서 점수 계산
    """

    # 현재월 시작일~다음달 1일 전까지 / 전달 시작일~이번달 1일 전까지 계산
    current_start, current_end_exclusive, previous_start, previous_end_exclusive = _parse_month_range(
        from_date, to_date
    )

    # 현재월 리뷰 조회
    current_reviews = _fetch_reviews(
        db=db,
        store_id=store_id,
        start_dt=current_start,
        end_dt_exclusive=current_end_exclusive,
    )

    # 전달 리뷰 조회
    previous_reviews = _fetch_reviews(
        db=db,
        store_id=store_id,
        start_dt=previous_start,
        end_dt_exclusive=previous_end_exclusive,
    )

    # 전체 기간 리뷰 조회
    # repeat customer, 첫 방문 여부, 코호트 계산 등에 사용
    all_reviews = _fetch_reviews_all(db=db, store_id=store_id)

    # 하단 고객 목록만 from ~ to 그대로 적용
    list_start, list_end_exclusive = _parse_date_range(from_date, to_date)

    list_reviews = _fetch_reviews(
        db=db,
        store_id=store_id,
        start_dt=list_start,
        end_dt_exclusive=list_end_exclusive,
    )

    list_customer_map = _group_reviews_by_customer(list_reviews)

    # 리뷰를 고객명(author_name 비슷한 값) 기준으로 묶음
    current_customer_map = _group_reviews_by_customer(current_reviews)
    previous_customer_map = _group_reviews_by_customer(previous_reviews)
    all_customer_map = _group_reviews_by_customer(all_reviews)

        # 현재월 고객별 지표 계산
    current_customers = _build_customer_metrics(
        customer_map=current_customer_map,
        all_customer_map=all_customer_map,
        now_dt=current_end_exclusive,
    )

    # 전달 고객별 지표 계산
    previous_customers = _build_customer_metrics(
        customer_map=previous_customer_map,
        all_customer_map=all_customer_map,
        now_dt=previous_end_exclusive,
    )

    # 하단 고객 목록 전용 metrics
    list_customers = _build_customer_metrics(
        customer_map=list_customer_map,
        all_customer_map=all_customer_map,
        now_dt=list_end_exclusive,
    )

    # 상단 KPI 카드용 요약
    # 현재값은 화면에서 선택한 from ~ to 기간 기준으로 맞춘다.
    summary = _build_summary(
        current_customers=list_customers,
        previous_customers=previous_customers,
        current_reviews=list_reviews,
        previous_reviews=previous_reviews,
    )

    # 리스크 분포(High / Medium / Low)
    # 상단 카드/차트도 하단과 동일하게 선택 기간 기준으로 맞춘다.
    risk_distribution = _build_risk_distribution(list_customers)

    # 방문 빈도 분포(주1회+, 월2회, 월1회, 첫방문 등)
    visit_frequency_distribution = _build_visit_frequency_distribution(list_customers)

    # 고객 세그먼트
    segments = _build_segments(list_customers)

    # 코호트 분석
    cohort = _build_cohort(all_customer_map, current_start, current_end_exclusive)

    # 하단 고객 리스트
    customers = _build_customer_list(list_customers)

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
    """
    특정 매장의 특정 기간 리뷰만 조회.

    조건:
    - store_id 일치
    - created_at_google >= start_dt
    - created_at_google < end_dt_exclusive

    end_dt_exclusive를 쓰는 이유:
    - 3월 1일 ~ 4월 1일 미만 같은 식으로 자르면
      월말 23:59:59 계산보다 훨씬 안전함
    """
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
    """
    특정 매장의 전체 리뷰를 모두 조회.

    사용처:
    - 고객의 전체 누적 방문 횟수 계산
    - 첫 방문 고객 / 재방문 고객 판별
    - 코호트 분석
    """
    return (
        db.query(GoogleReview)
        .filter(GoogleReview.store_id == store_id)
        .order_by(GoogleReview.created_at_google.asc())
        .all()
    )


# ----------------------------
# parsing helpers
# ----------------------------
def _parse_month_range(
    from_date: str | None,
    to_date: str | None,
) -> tuple[datetime, datetime, datetime, datetime]:
    """
    현재월과 전달의 날짜 범위를 계산한다.

    기준 날짜 결정 우선순위:
    1) to_date가 있으면 to_date의 연/월 기준
    2) 없으면 from_date의 연/월 기준
    3) 둘 다 없으면 오늘 날짜 기준

    예:
    to_date = '2026-03-15' 이면
    - current_start = 2026-03-01
    - current_end_exclusive = 2026-04-01
    - previous_start = 2026-02-01
    - previous_end_exclusive = 2026-03-01

    즉 이 서비스는 from~to 전체 기간을 직접 비교하는 게 아니라,
    'to_date가 속한 월 전체'와 '그 전달 전체'를 비교하는 구조다.
    """
    today = datetime.now()

    if to_date:
        base_dt = datetime.strptime(to_date, "%Y-%m-%d")
    elif from_date:
        base_dt = datetime.strptime(from_date, "%Y-%m-%d")
    else:
        base_dt = today

    current_year = base_dt.year
    current_month = base_dt.month

    # 현재월 시작일
    current_start = datetime(current_year, current_month, 1)

    # 현재월 마지막 날짜 구해서 '다음날 00:00'을 종료 시점(exclusive)으로 잡음
    current_last_day = monthrange(current_year, current_month)[1]
    current_end_exclusive = datetime(current_year, current_month, current_last_day) + timedelta(days=1)

    # 전달 계산
    if current_month == 1:
        previous_year = current_year - 1
        previous_month = 12
    else:
        previous_year = current_year
        previous_month = current_month - 1

    previous_start = datetime(previous_year, previous_month, 1)
    previous_last_day = monthrange(previous_year, previous_month)[1]
    previous_end_exclusive = datetime(previous_year, previous_month, previous_last_day) + timedelta(days=1)

    return current_start, current_end_exclusive, previous_start, previous_end_exclusive

def _parse_date_range(
    from_date: str | None,
    to_date: str | None,
) -> tuple[datetime, datetime]:
    """
    from ~ to 범위를 그대로 반환한다.
    종료일은 inclusive로 받되, 조회용으로는 다음날 00:00(exclusive)로 변환한다.
    """
    today = datetime.now()

    if from_date:
        start_dt = datetime.strptime(from_date, "%Y-%m-%d")
    elif to_date:
        start_dt = datetime.strptime(to_date, "%Y-%m-%d")
    else:
        start_dt = today.replace(hour=0, minute=0, second=0, microsecond=0)

    if to_date:
        end_dt_exclusive = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
    elif from_date:
        end_dt_exclusive = datetime.strptime(from_date, "%Y-%m-%d") + timedelta(days=1)
    else:
        end_dt_exclusive = start_dt + timedelta(days=1)

    return start_dt, end_dt_exclusive

# ----------------------------
# customer grouping
# ----------------------------
def _group_reviews_by_customer(
    reviews: list[GoogleReview],
) -> dict[str, list[GoogleReview]]:
    """
    리뷰 리스트를 고객명 기준으로 묶는다.

    반환 예시:
    {
      "홍길동": [리뷰1, 리뷰2],
      "김철수": [리뷰3],
    }
    """
    grouped: dict[str, list[GoogleReview]] = defaultdict(list)

    for review in reviews:
        name = _extract_customer_name(review)
        grouped[name].append(review)

    return grouped


def _extract_customer_name(review: GoogleReview) -> str:
    """
    리뷰 객체에서 고객명을 뽑아낸다.

    왜 이렇게 여러 후보를 보냐면:
    - 환경/DB 모델마다 고객명 컬럼명이 다를 수 있기 때문
    - author_name, reviewer_name, user_name 등 후보를 순서대로 검사

    값이 없으면 '익명 고객'으로 대체한다.
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
    """
    리뷰 객체에서 작성일 datetime을 뽑아낸다.

    created_at_google이 우선이고,
    환경에 따라 create_time / created_at도 후보로 본다.
    """
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
    """
    고객별 상세 지표를 계산하는 핵심 함수.

    입력:
    - customer_map: 현재월 또는 전달처럼 '분석 대상 구간'의 고객별 리뷰
    - all_customer_map: 전체 기간 고객별 리뷰
    - now_dt: 점수 계산 기준 시점
      (현재월 분석이면 current_end_exclusive, 전달 분석이면 previous_end_exclusive)

    이 함수에서 계산하는 대표 값:
    - review_count: 해당 구간 리뷰 수
    - total_review_count_all_time: 전체 기간 누적 리뷰 수
    - avg_rating: 해당 구간 평균 평점
    - last_activity: 해당 구간 마지막 리뷰 날짜
    - sentiment: 평균 평점 기반 감성 라벨
    - churn_score / churn_level: 이탈 점수와 등급
    - visit_frequency_label: 주1회+, 월2회, 월1회, 첫방문 등
    - is_repeat_customer / is_first_visit_customer
    """
    result: list[dict[str, Any]] = []

    # timezone 섞임 방지
    now_dt = _to_naive_utc(now_dt) or datetime.min

    for customer_name, reviews in customer_map.items():
        # 현재 분석 구간 리뷰를 날짜순 정렬
        reviews_sorted = sorted(
            reviews,
            key=lambda r: _safe_sort_dt(_extract_review_datetime(r)),
        )

        # 전체 기간 리뷰도 날짜순 정렬
        all_reviews_sorted = sorted(
            all_customer_map.get(customer_name, []),
            key=lambda r: _safe_sort_dt(_extract_review_datetime(r)),
        )

        # 현재 분석 구간의 평점 목록
        ratings = [float(r.rating) for r in reviews_sorted if r.rating is not None]

        # 평균 평점 = 현재 분석 구간 평점 평균
        avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else 0.0

        # 현재 분석 구간 마지막 리뷰일
        last_dt = _extract_review_datetime(reviews_sorted[-1]) if reviews_sorted else None

        # 전체 기간 첫 리뷰일
        first_all_dt = _extract_review_datetime(all_reviews_sorted[0]) if all_reviews_sorted else None

        last_dt = _to_naive_utc(last_dt)
        first_all_dt = _to_naive_utc(first_all_dt)

        # 현재 분석 구간 방문 수
        visit_count_current = len(reviews_sorted)

        # 전체 누적 방문 수
        visit_count_all = len(all_reviews_sorted)

        # 마지막 활동 이후 경과일
        days_since_last = max((now_dt - last_dt).days, 0) if last_dt else 999

        # 누적 리뷰 2개 이상이면 재방문 고객
        is_repeat_customer = visit_count_all >= 2

        # 누적 리뷰 1개면 첫 방문 고객
        is_first_visit_customer = visit_count_all == 1

        # 방문 빈도 라벨
        visit_frequency_label = _classify_visit_frequency(
            visit_count=visit_count_current,
            first_visit_customer=is_first_visit_customer,
        )

        # 부정 리뷰 수
        negative_count = sum(
            1 for r in reviews_sorted
            if r.rating is not None and float(r.rating) <= 2
        )

        # 부정 리뷰 비율
        negative_ratio = (negative_count / len(ratings)) if ratings else 0.0

        # churn.py는 timezone aware datetime을 기대하므로 UTC tzinfo를 다시 붙임
        aware_last_dt = (
            last_dt.replace(tzinfo=timezone.utc) if last_dt is not None else datetime.now(timezone.utc)
        )

        # 이탈 점수 계산
        churn_score = calculate_churn_score(
            avg_rating=avg_rating,
            negative_ratio=negative_ratio,
            last_review_at=aware_last_dt,
        )

        # 점수 -> HIGH / MEDIUM / LOW 등급 변환
        risk_level = calculate_churn_level(churn_score)

        # 평균 평점 기준 감성 라벨
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
                "churn_level": risk_level,
                "visit_frequency_label": visit_frequency_label,
                "is_repeat_customer": is_repeat_customer,
                "is_first_visit_customer": is_first_visit_customer,
                "days_since_last": days_since_last,
            }
        )

    return result


def _classify_visit_frequency(
    visit_count: int,
    first_visit_customer: bool,
) -> str:
    """
    방문 수를 사람이 보기 쉬운 라벨로 바꾼다.

    규칙:
    - 전체 누적 기준 첫 방문 고객이고 현재 구간 방문 수가 1 이하 -> "첫 방문"
    - 현재 구간 방문 수 4회 이상 -> "주 1회+"
    - 현재 구간 방문 수 2~3회 -> "월 2회"
    - 현재 구간 방문 수 1회 -> "월 1회"
    - 그 외 -> "가끔"
    """
    if first_visit_customer and visit_count <= 1:
        return "첫 방문"
    if visit_count >= 4:
        return "주 1회+"
    if visit_count >= 2:
        return "월 2회"
    if visit_count == 1:
        return "월 1회"
    return "가끔"


def _rating_to_sentiment(avg_rating: float) -> str:
    """
    평균 평점을 감성 라벨로 단순 변환.

    규칙:
    - 4.0 이상 -> positive
    - 3.0 이상 -> neutral
    - 3.0 미만 -> negative
    """
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
    """
    상단 KPI 카드용 요약 데이터를 만든다.

    계산 항목:
    - total_customers: 현재월 고객 수 vs 전달 고객 수
    - at_risk_customers: HIGH 위험 고객 수 vs 전달 HIGH 위험 고객 수
    - avg_satisfaction: 현재월 전체 리뷰 평균 평점 vs 전달 평균 평점
    - repeat_visit_rate: 재방문 고객 비율 vs 전달 비율
    """
    current_total_customers = len(current_customers)
    previous_total_customers = len(previous_customers)

    # HIGH 등급만 이탈 위험 고객으로 계산
    current_at_risk = sum(1 for c in current_customers if c["churn_level"] == "HIGH")
    previous_at_risk = sum(1 for c in previous_customers if c["churn_level"] == "HIGH")

    # 리뷰 단위 평균 만족도
    current_avg_satisfaction = _avg_rating_from_reviews(current_reviews)
    previous_avg_satisfaction = _avg_rating_from_reviews(previous_reviews)

    # 고객 단위 재방문율
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
        "delta_pct": _delta_pct(current_avg_satisfaction, previous_avg_satisfaction),
    },
        "repeat_visit_rate": {
            "current": current_repeat_visit_rate,
            "previous": previous_repeat_visit_rate,
            "delta_pct": round(current_repeat_visit_rate - previous_repeat_visit_rate, 1),
        },
    }


def _avg_rating_from_reviews(reviews: list[GoogleReview]) -> float:
    """
    리뷰 리스트의 평균 평점을 계산한다.

    고객별 평균이 아니라 '리뷰 전체 기준 평균'임.
    """
    ratings = [float(r.rating) for r in reviews if r.rating is not None]
    if not ratings:
        return 0.0
    return round(sum(ratings) / len(ratings), 1)


def _repeat_visit_rate(customers: list[dict[str, Any]]) -> float:
    """
    재방문율 계산.

    공식:
    (재방문 고객 수 / 전체 고객 수) * 100

    재방문 고객 기준:
    - total_review_count_all_time >= 2
    """
    total = len(customers)
    if total == 0:
        return 0.0
    repeat_count = sum(1 for c in customers if c["is_repeat_customer"])
    return round((repeat_count / total) * 100, 1)


def _delta_pct(current: float, previous: float) -> float:
    """
    전월 대비 증감률 계산.

    공식:
    ((current - previous) / previous) * 100

    예외 처리:
    - previous가 0이고 current도 0이면 0.0
    - previous가 0인데 current가 있으면 100.0으로 처리
    """
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
    """
    고객을 churn_level 기준으로 HIGH / MEDIUM / LOW로 나눠 분포를 만든다.

    반환 항목:
    - count: 해당 등급 고객 수
    - pct: 전체 고객 중 비중(%)
    - avg_churn_pct: HIGH 고객들의 평균 churn_score
      (현재는 high에만 평균 점수를 내려줌)
    """
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
    """
    고객별 visit_frequency_label을 모아 전체 분포를 만든다.

    반환 값은 count가 아니라 pct(%) 기준이다.
    예:
    - weekly_plus: 전체 고객 중 '주 1회+' 비율
    - first_visit: 전체 고객 중 '첫 방문' 비율

    repeat_intent_rate는 현재 구현상 _repeat_visit_rate와 같은 값이다.
    """
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

    loyal = []
    new = []
    at_risk = []
    reactivation = []

    for c in customers:
        avg_rating = float(c.get("avg_rating", 0) or 0)
        churn_level = c.get("churn_level")
        is_repeat = bool(c.get("is_repeat_customer"))
        is_first = bool(c.get("is_first_visit_customer"))
        days_since_last = int(c.get("days_since_last", 999) or 999)

        # 1) 이탈 위험 최우선
        if churn_level == "HIGH":
            at_risk.append(c)

        # 2) 충성 고객
        elif is_repeat and avg_rating >= 4.0 and churn_level == "LOW":
            loyal.append(c)

        # 3) 재활성화 필요
        elif is_repeat and days_since_last >= 30:
            reactivation.append(c)

        # 4) 신규 고객
        elif is_first and avg_rating >= 3.0:
            new.append(c)

        # 그 외는 일단 제외하거나 필요시 별도 처리
        else:
            pass

    def avg_rating_of(rows):
        if not rows:
            return 0.0
        return round(sum(float(r.get("avg_rating", 0) or 0) for r in rows) / len(rows), 1)

    def share(rows):
        return round(len(rows) / total * 100, 1)

    def avg_churn(rows):
        if not rows:
            return 0.0
        return round(sum(float(r.get("churn_score", 0) or 0) for r in rows) / len(rows), 1)

    insights = []
    if new:
        insights.append(f"신규 고객이 {len(new)}명입니다.")
    if loyal:
        insights.append(f"충성 고객이 {len(loyal)}명으로 유지 강화 대상입니다.")
    if at_risk:
        insights.append(f"이탈 위험 고객이 {len(at_risk)}명으로 빠른 대응이 필요합니다.")
    if reactivation:
        insights.append(f"재활성화 대상 고객이 {len(reactivation)}명입니다.")

    return {
        "loyal": {
            "count": len(loyal),
            "share_pct": share(loyal),
            "avg_rating": avg_rating_of(loyal),
        },
        "new": {
            "count": len(new),
            "share_pct": share(new),
            "avg_rating": avg_rating_of(new),
            "conversion_rate": round(_repeat_visit_rate(new), 1),
        },
        "at_risk": {
            "count": len(at_risk),
            "share_pct": share(at_risk),
            "avg_rating": avg_rating_of(at_risk),
            "churn_probability": avg_churn(at_risk),
        },
        "reactivation": {
            "count": len(reactivation),
            "share_pct": share(reactivation),
            "avg_rating": avg_rating_of(reactivation),
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
    코호트 분석 생성.

    코호트 기준:
    - 고객이 처음 리뷰를 남긴 월 = 코호트 월

    계산 방식:
    - 예: 2026.01 코호트에 속한 고객들이
      2026.02(M+1), 2026.03(M+2), 2026.04(M+3)에 다시 리뷰를 남겼는지 계산
    - 각 월별 재방문율(리텐션)을 퍼센트로 반환

    summary_text:
    - M+1 재방문율이 가장 높은 코호트를 한 줄 요약으로 보여줌
    """
    current_end_exclusive = _to_naive_utc(current_end_exclusive) or datetime.max
    cohort_buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for customer_name, reviews in all_customer_map.items():
        # 현재 화면 종료 시점 이전 리뷰들만 사용
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

        # 첫 리뷰 월이 코호트
        first_dt = review_dates[0]
        cohort_key = first_dt.strftime("%Y.%m")

        # 이 고객이 활동한 (연, 월) 집합
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

        # M+1 ~ M+5 재방문율 계산
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

        # 가장 높은 M+1 코호트 추적
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
    """
    'YYYY.MM' 문자열 코호트 키를 받아서
    offset 개월 뒤 리텐션을 계산하는 래퍼 함수.
    """
    cohort_year, cohort_month = map(int, cohort_key.split("."))
    return _cohort_retention(members, cohort_year, cohort_month, offset)


def _cohort_retention(
    members: list[dict[str, Any]],
    cohort_year: int,
    cohort_month: int,
    offset: int,
) -> float | None:
    """
    특정 코호트의 offset 개월 뒤 재방문율 계산.

    예:
    - cohort_year=2026, cohort_month=1, offset=1
    - target = 2026년 2월
    - members 중 2026년 2월에 리뷰를 남긴 고객 비율 계산

    공식:
    retained / eligible * 100
    """
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
    """
    year/month에 offset개월을 더한 결과를 반환.

    예:
    - (2026, 1) + 1 -> (2026, 2)
    - (2026, 12) + 1 -> (2027, 1)
    """
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
    """
    프론트 하단 고객 리스트용 데이터 생성.

    현재 customer metrics에서 필요한 필드만 골라서 정리하고,
    태그를 붙인 뒤,
    churn_score 높은 순 -> avg_rating 높은 순으로 정렬한다.
    """
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
    """
    고객 카드에 붙일 태그 생성.

    규칙:
    - sentiment에 따라 긍정/중립/부정 리뷰 태그
    - churn_level이 HIGH면 '이탈 위험'
    - 전체 누적 리뷰가 3개 이상이면 '반복 방문'
    - 평균 평점이 4 이상이면 '고평점'
    """
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