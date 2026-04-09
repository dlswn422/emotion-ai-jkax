from fastapi import APIRouter, Query

from backend.service.b2b_cache_service import get_b2b_cache_current
from backend.service.cache_query_service import (
    resolve_fixed_period_type,
    b2b_competitor_cache_miss_response,
    b2b_competitor_error_response,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/competitor-analysis")
def get_competitor_analysis_dashboard(
    tenant_id: int = Query(...),
    period_type: str | None = Query(None, description="1D/7D/30D/90D/180D"),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    resolved_period_type = resolve_fixed_period_type(
        period_type=period_type,
        from_date=from_date,
        to_date=to_date,
        allow_all=False,
        require_latest_end=False,
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

    # SUCCESS, NO_DATA는 캐시에 저장된 최종 JSON 그대로 반환
    # shape:
    # {
    #   "issueKeywords": [...],
    #   "issueSources": [...]
    # }
    return row["response_json"]