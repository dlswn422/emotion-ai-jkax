from fastapi import APIRouter, UploadFile, File, Depends, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.service.analysis_service import analyze_file_sentiment
from backend.service.cx_cache_service import get_cx_cache_current
from backend.service.cache_query_service import (
    resolve_fixed_period_type,
    cx_cache_miss_response,
    cx_error_response,
)

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"],
)


@router.post("/file")
async def analyze_file(
    file: UploadFile = File(...)
):
    return await analyze_file_sentiment(file)


@router.post("/cx-analysis")
def analyze_cx_dashboard_api(
    store_id: str = Query(..., description="store_id"),
    period_type: str | None = Query(None, description="1D/7D/30D/90D/180D"),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    db: Session = Depends(get_db),  # 기존 시그니처 호환용 유지
):
    """
    캐시 조회형 CX 대시보드 분석

    지원:
    - 권장: store_id + period_type
    - 1차 호환: store_id + from/to
    """
    _ = db  # 기존 Depends(get_db) 호환용, 현재 조회형에선 직접 사용 안 함

    resolved_period_type = resolve_fixed_period_type(
        period_type=period_type,
        from_date=from_date,
        to_date=to_date,
        allow_all=False,
        require_latest_end=False,
    )

    row = get_cx_cache_current(store_id, resolved_period_type)

    if not row:
        return cx_cache_miss_response()

    if row["status"] == "ERROR":
        return cx_error_response()

    # SUCCESS, NO_REVIEWS는 저장된 최종 JSON 그대로 반환
    return row["response_json"]