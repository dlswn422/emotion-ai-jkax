from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.service.b2b_cache_service import get_b2b_cache_current
from backend.service.cache_query_service import (
    resolve_fixed_period_type,
    b2b_customer_trend_cache_miss_response,
    b2b_customer_trend_error_response,
    b2b_competitor_cache_miss_response,
    b2b_competitor_error_response,
)
from backend.service.dashboard_service import get_rating_trend

router = APIRouter()


@router.get("/dashboard/customer-trend")
def get_customer_trend(
    tenant_id: int = Query(...),
    period_type: str | None = Query(None),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    """
    캐시 조회형 고객동향 분석 API (기간별)

    요청 예시:
    GET /dashboard/customer-trend?tenant_id=1&period_type=30D
    GET /dashboard/customer-trend?tenant_id=1&from=2026-03-10&to=2026-04-09
    """
    # period_type / from / to 모두 없으면 30D 기본값 (구버전 프론트 호환)
    if not period_type and not from_date and not to_date:
        period_type = "30D"

    resolved = resolve_fixed_period_type(
        period_type=period_type,
        from_date=from_date,
        to_date=to_date,
        allow_all=False,
        require_latest_end=False,
    )

    row = get_b2b_cache_current(
        tenant_id=tenant_id,
        analysis_type="CUSTOMER_TREND",
        period_type=resolved,
    )

    if not row:
        return b2b_customer_trend_cache_miss_response()

    if row["status"] == "ERROR":
        return b2b_customer_trend_error_response()

    return row["response_json"]


@router.get("/dashboard/competitor-analysis")
def get_competitor_analysis(
    tenant_id: int = Query(...),
    period_type: str | None = Query(None),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    """
    캐시 조회형 경쟁사 분석 API (기간별)

    요청 예시:
    GET /dashboard/competitor-analysis?tenant_id=1&period_type=30D
    GET /dashboard/competitor-analysis?tenant_id=1&from=2026-03-10&to=2026-04-09
    """
    resolved = resolve_fixed_period_type(
        period_type=period_type,
        from_date=from_date,
        to_date=to_date,
        allow_all=False,
        require_latest_end=False,
    )

    row = get_b2b_cache_current(
        tenant_id=tenant_id,
        analysis_type="COMPETITOR_ANALYSIS",
        period_type=resolved,
    )

    if not row:
        return b2b_competitor_cache_miss_response()

    if row["status"] == "ERROR":
        return b2b_competitor_error_response()

    return row["response_json"]


@router.get("/dashboard/rating-trend")
def get_rating_trend_api(
    store_id: str = Query(...),
    unit: Literal["day", "month"] = Query("day"),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    """
    매장 평점 추이 API

    응답: [{date, avg_rating, review_count, highlight}, ...] 배열 직접 반환
    """
    from_date_parsed: date | None = None
    to_date_parsed: date | None = None

    if from_date:
        try:
            from_date_parsed = date.fromisoformat(from_date)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"잘못된 from 날짜 형식: {from_date}")

    if to_date:
        try:
            to_date_parsed = date.fromisoformat(to_date)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"잘못된 to 날짜 형식: {to_date}")

    return get_rating_trend(
        db=db, store_id=store_id, unit=unit,
        from_date=from_date_parsed, to_date=to_date_parsed,
    )