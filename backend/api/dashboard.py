from __future__ import annotations

from fastapi import APIRouter, Query

from backend.service.b2b_cache_service import get_b2b_cache_current
from backend.service.cache_query_service import (
    resolve_fixed_period_type,
    b2b_customer_trend_cache_miss_response,
    b2b_customer_trend_error_response,
    b2b_competitor_cache_miss_response,
    b2b_competitor_error_response,
)

router = APIRouter()


@router.get("/dashboard/customer-trend")
def get_customer_trend(tenant_id: int = Query(...)):
    """
    캐시 조회형 고객동향 분석 API

    요청 예시:
    GET /dashboard/customer-trend?tenant_id=1
    """
    row = get_b2b_cache_current(
        tenant_id=tenant_id,
        analysis_type="CUSTOMER_TREND",
        period_type="ALL",
    )

    if not row:
        return b2b_customer_trend_cache_miss_response()

    if row["status"] == "ERROR":
        return b2b_customer_trend_error_response()

    # SUCCESS, NO_DATA는 저장된 최종 JSON 그대로 반환
    return row["response_json"]


@router.get("/dashboard/competitor-analysis")
def get_competitor_analysis(
    tenant_id: int = Query(...),
    period_type: str | None = Query(None),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    """
    캐시 조회형 경쟁사 분석 API

    요청 예시:
    1) 권장
    GET /dashboard/competitor-analysis?tenant_id=1&period_type=30D

    2) 1차 호환용
    GET /dashboard/competitor-analysis?tenant_id=1&from=2026-03-10&to=2026-04-08
    """
    resolved_period_type = resolve_fixed_period_type(
        period_type=period_type,
        from_date=from_date,
        to_date=to_date,
        allow_all=False,
        require_latest_end=True,
    )

    row = get_b2b_cache_current(
        tenant_id=tenant_id,
        analysis_type="COMPETITOR_ANALYSIS",
        period_type=resolved_period_type,
    )

    if not row:
        return b2b_competitor_cache_miss_response()

    if row["status"] == "ERROR":
        return b2b_competitor_error_response()

    # SUCCESS, NO_DATA는 저장된 최종 JSON 그대로 반환
    return row["response_json"]