from typing import Any, Optional

from fastapi import APIRouter, UploadFile, File, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.service.analysis_service import (
    analyze_store_cx_by_period,
    analyze_file_sentiment,
)
from backend.service.cx_cache_service import get_cx_cache_current

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
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    period_type: Optional[str] = Query(
        None,
        description="7D | 30D | 90D | 365D",
    ),
    db: Session = Depends(get_db),
):
    """
    CX 대시보드 조회

    우선순위:
    1) period_type이 명시되면 DB 캐시 조회만 수행
    2) from/to만 있으면 기존 realtime 분석
    """

    resolved_period_type = period_type

    # 1) 운영 경로: period_type 기반 DB 조회
    if resolved_period_type:
        cached = get_cx_cache_current(
            store_id=store_id,
            period_type=resolved_period_type,
        )

        if not cached:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "CACHE_NOT_READY",
                    "message": f"{store_id} / {resolved_period_type} 캐시가 아직 없습니다.",
                },
            )

        status = cached.get("status")
        response_json = cached.get("response_json")

        if status in ("SUCCESS", "NO_REVIEWS", "PARTIAL_SUCCESS") and _is_minimal_cx_cache_response(response_json):
            print(
                f"[cx-analysis] cache hit "
                f"store_id={store_id} period_type={resolved_period_type} status={status}"
            )
            return response_json

        raise HTTPException(
            status_code=409,
            detail={
                "code": "CACHE_UNUSABLE",
                "message": f"{store_id} / {resolved_period_type} 캐시는 있으나 현재 사용 불가 상태입니다.",
                "status": status,
            },
        )

    # 2) 예외/관리자용: from/to 기반 realtime
    if not from_date or not to_date:
        raise HTTPException(
            status_code=400,
            detail="from/to 또는 period_type 중 하나는 필요합니다.",
        )

    print(
        f"[cx-analysis] realtime analyze "
        f"store_id={store_id} from={from_date} to={to_date}"
    )

    return analyze_store_cx_by_period(
        store_id=store_id,
        from_date=from_date,
        to_date=to_date,
        db=db,
    )


@router.get("/cx-analysis/cache")
def get_cx_analysis_cache_api(
    store_id: str = Query(..., description="store_id"),
    period_type: str = Query(..., description="7D | 30D | 90D | 365D"),
):
    cached = get_cx_cache_current(store_id=store_id, period_type=period_type)

    if not cached:
        raise HTTPException(status_code=404, detail="캐시 없음")

    return cached


def _has_content(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, tuple, set, dict)):
        return len(value) > 0
    return True


def _is_minimal_cx_cache_response(payload: Any) -> bool:
    if not isinstance(payload, dict):
        return False

    return (
        "review_count" in payload
        and "rating" in payload
        and isinstance(payload.get("rating_distribution"), list)
    )