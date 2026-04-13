from __future__ import annotations

from datetime import datetime, timezone
from fastapi import HTTPException


VALID_PERIOD_TYPES = {"1D", "7D", "30D", "90D", "365D"}


def _parse_iso_to_date(value: str):
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        raise HTTPException(status_code=400, detail=f"잘못된 날짜 형식입니다: {value}")


def resolve_fixed_period_type(
    *,
    period_type: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    allow_all: bool = False,
    require_latest_end: bool = True,
) -> str:
    """
    1차 호환용:
    - period_type가 있으면 그대로 사용
    - 없으면 from/to를 fixed period로 변환
    - 커스텀 범위는 허용하지 않음

    require_latest_end=True 인 경우:
    - to_date는 오늘(UTC 기준)이어야 함
    - 과거 임의 기간을 현재 캐시 period로 오인 조회하는 것을 방지
    """
    if period_type:
        if allow_all and period_type == "ALL":
            return period_type
        if period_type in VALID_PERIOD_TYPES:
            return period_type
        raise HTTPException(status_code=400, detail="지원하지 않는 period_type 입니다.")

    if not from_date or not to_date:
        raise HTTPException(
            status_code=400,
            detail="period_type 또는 from/to 가 필요합니다.",
        )

    start = _parse_iso_to_date(from_date)
    end = _parse_iso_to_date(to_date)

    if end < start:
        raise HTTPException(status_code=400, detail="to_date는 from_date보다 빠를 수 없습니다.")

    if require_latest_end:
        today_utc = datetime.now(timezone.utc).date()
        if end != today_utc:
            raise HTTPException(
                status_code=400,
                detail="현재는 오늘 포함 고정 기간(1D/7D/30D/90D/180D)만 지원합니다.",
            )

    days = (end - start).days  # +1 제거: 프론트 from/to 날짜 차이 기준으로 매핑

    mapping = {
        1: "1D",
        7: "7D",
        30: "30D",
        90: "90D",
        365: "365D",
    }

    if days not in mapping:
        raise HTTPException(
            status_code=400,
            detail="고정 기간(1D/7D/30D/90D/365D)만 지원합니다.",
        )

    return mapping[days]


def cx_cache_miss_response() -> dict:
    return {
        "message": "해당 기간의 분석 결과가 아직 준비되지 않았습니다.",
        "review_count": 0,
        "rating_distribution": [
            {"stars": 5, "count": 0},
            {"stars": 4, "count": 0},
            {"stars": 3, "count": 0},
            {"stars": 2, "count": 0},
            {"stars": 1, "count": 0},
        ],
    }


def cx_error_response() -> dict:
    return {
        "message": "분석 결과를 불러올 수 없습니다.",
        "review_count": 0,
        "rating_distribution": [
            {"stars": 5, "count": 0},
            {"stars": 4, "count": 0},
            {"stars": 3, "count": 0},
            {"stars": 2, "count": 0},
            {"stars": 1, "count": 0},
        ],
    }


def b2b_customer_trend_cache_miss_response() -> dict:
    return {
        "signalKeywords": [],
        "prospects": [],
        "message": "해당 분석 결과가 아직 준비되지 않았습니다.",
    }


def b2b_customer_trend_error_response() -> dict:
    return {
        "signalKeywords": [],
        "prospects": [],
        "message": "분석 결과를 불러올 수 없습니다.",
    }


def b2b_competitor_cache_miss_response() -> dict:
    return {
        "issueKeywords": [],
        "issueSources": [],
        "message": "해당 분석 결과가 아직 준비되지 않았습니다.",
    }


def b2b_competitor_error_response() -> dict:
    return {
        "issueKeywords": [],
        "issueSources": [],
        "message": "분석 결과를 불러올 수 없습니다.",
    }