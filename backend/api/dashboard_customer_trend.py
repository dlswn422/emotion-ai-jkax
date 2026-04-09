from fastapi import APIRouter, Query

from backend.service.b2b_cache_service import get_b2b_cache_current
from backend.service.cache_query_service import (
    b2b_customer_trend_cache_miss_response,
    b2b_customer_trend_error_response,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/customer-trend")
def get_customer_trend_dashboard(
    tenant_id: int = Query(...),
):
    row = get_b2b_cache_current(
        tenant_id=tenant_id,
        analysis_type="CUSTOMER_TREND",
        period_type="ALL",
    )

    if not row:
        return b2b_customer_trend_cache_miss_response()

    if row["status"] == "ERROR":
        return b2b_customer_trend_error_response()

    # SUCCESS, NO_DATA는 캐시에 저장된 최종 JSON 그대로 반환
    # shape:
    # {
    #   "signalKeywords": [...],
    #   "prospects": [...]
    # }
    return row["response_json"]