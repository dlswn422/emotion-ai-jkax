from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, UploadFile, File, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.service.analysis_service import analyze_store_cx_by_period, analyze_file_sentiment
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
    period_type: Optional[str] = Query(None, description="1D | 7D | 30D | 90D | 365D"),
    db: Session = Depends(get_db),
):
    """
    CX 대시보드 조회

    우선순위:
    1) period_type이 있으면 cache-first
    2) from/to가 오늘 종료 기준의 고정 기간이면 cache-first
    3) cache가 비어 있거나 품질이 낮으면 realtime fallback
    4) 그 외는 기존 실시간 계산
    """

    resolved_period_type = period_type

    if not resolved_period_type and from_date and to_date:
        resolved_period_type = _resolve_period_type_from_range(from_date, to_date)

    if resolved_period_type:
        cached = get_cx_cache_current(store_id=store_id, period_type=resolved_period_type)

        if cached:
            status = cached.get("status")
            response_json = cached.get("response_json")

            if status == "NO_REVIEWS" and _is_minimal_cx_cache_response(response_json):
                print(
                    f"[cx-analysis] cache hit "
                    f"store_id={store_id} period_type={resolved_period_type} status={status}"
                )
                return response_json

            if status == "SUCCESS" and _is_usable_cx_cache_response(response_json):
                print(
                    f"[cx-analysis] cache hit "
                    f"store_id={store_id} period_type={resolved_period_type} status={status}"
                )
                return response_json

            print(
                f"[cx-analysis] cache unusable -> fallback realtime "
                f"store_id={store_id} period_type={resolved_period_type} status={status}"
            )
        else:
            print(
                f"[cx-analysis] cache miss -> fallback realtime "
                f"store_id={store_id} period_type={resolved_period_type}"
            )

        if not from_date or not to_date:
            today = datetime.now(timezone.utc).date()
            from_date, to_date = _build_range_from_period_type(resolved_period_type, today)

    if not from_date or not to_date:
        raise HTTPException(status_code=400, detail="from/to 또는 period_type 중 하나는 필요합니다.")

    return analyze_store_cx_by_period(
        store_id=store_id,
        from_date=from_date,
        to_date=to_date,
        db=db,
    )


@router.get("/cx-analysis/cache")
def get_cx_analysis_cache_api(
    store_id: str = Query(..., description="store_id"),
    period_type: str = Query(..., description="1D | 7D | 30D | 90D | 365D"),
):
    cached = get_cx_cache_current(store_id=store_id, period_type=period_type)

    if not cached:
        raise HTTPException(status_code=404, detail="캐시 없음")

    return cached


def _resolve_period_type_from_range(from_date: str, to_date: str) -> Optional[str]:
    try:
        start = datetime.fromisoformat(from_date).date()
        end = datetime.fromisoformat(to_date).date()
    except ValueError:
        return None

    today_utc = datetime.now(timezone.utc).date()

    if end != today_utc:
        return None

    days = (end - start).days + 1
    mapping = {
        1: "1D",
        7: "7D",
        30: "30D",
        90: "90D",
        365: "365D",
    }
    return mapping.get(days)


def _build_range_from_period_type(period_type: str, end_date):
    days_map = {
        "1D": 1,
        "7D": 7,
        "30D": 30,
        "90D": 90,
        "365D": 365,
    }

    if period_type not in days_map:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 period_type: {period_type}")

    days = days_map[period_type]
    start_date = end_date - timedelta(days=days - 1)
    return start_date.isoformat(), end_date.isoformat()


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


def _is_usable_cx_cache_response(payload: Any) -> bool:
    if not _is_minimal_cx_cache_response(payload):
        return False

    review_count = payload.get("review_count", 0)
    if review_count == 0:
        return True

    rich_fields = [
        payload.get("sentiment"),
        payload.get("nps"),
        payload.get("executive_summary"),
        payload.get("action_plan"),
        payload.get("drivers_of_satisfaction"),
        payload.get("areas_for_improvement"),
        payload.get("positive_keywords"),
        payload.get("negative_keywords"),
        payload.get("strategic_insights"),
    ]

    return any(_has_content(field) for field in rich_fields)