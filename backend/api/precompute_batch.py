from __future__ import annotations

import os
from calendar import monthrange
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query

from backend.batch.batch_utils import VALID_PERIOD_TYPES

router = APIRouter(prefix="/batch/precompute", tags=["batch-precompute"])

BATCH_SECRET = os.getenv("BATCH_SECRET", "")
KST = ZoneInfo("Asia/Seoul")


def _verify_secret(secret: str) -> None:
    if not BATCH_SECRET:
        raise HTTPException(status_code=500, detail="BATCH_SECRET 환경변수가 설정되지 않았습니다.")
    if secret != BATCH_SECRET:
        raise HTTPException(status_code=403, detail="인증 실패")


def _now_kst() -> datetime:
    return datetime.now(KST)


def _is_last_day_of_month() -> bool:
    now = _now_kst()
    return now.day == monthrange(now.year, now.month)[1]


def _is_quarter_end_month() -> bool:
    return _now_kst().month in (3, 6, 9, 12)


def _run_precompute_batches(
    *,
    period_types: list[str],
    store_ids: list[str] | None = None,
    tenant_ids: list[int] | None = None,
    include_store: bool = True,
    include_b2b: bool = True,
) -> dict:
    errors: list[str] = []

    if include_store:
        try:
            from backend.batch.run_store_analysis_batch import run_store_analysis_batch

            print(
                f"[precompute-batch] store batch 시작 periods={period_types} store_ids={store_ids}"
            )
            run_store_analysis_batch(store_ids=store_ids, period_types=period_types)
            print(f"[precompute-batch] store batch 완료 periods={period_types}")
        except Exception as exc:
            msg = f"store batch 실패: {exc}"
            print(f"[precompute-batch] ❌ {msg}")
            errors.append(msg)

    if include_b2b:
        try:
            from backend.batch.run_b2b_dashboard_batch import run_b2b_dashboard_batch

            print(
                f"[precompute-batch] b2b batch 시작 periods={period_types} tenant_ids={tenant_ids}"
            )
            run_b2b_dashboard_batch(tenant_ids=tenant_ids, period_types=period_types)
            print(f"[precompute-batch] b2b batch 완료 periods={period_types}")
        except Exception as exc:
            msg = f"b2b batch 실패: {exc}"
            print(f"[precompute-batch] ❌ {msg}")
            errors.append(msg)

    if errors:
        raise HTTPException(status_code=500, detail=" | ".join(errors))

    return {
        "status": "success",
        "periods": period_types,
        "include_store": include_store,
        "include_b2b": include_b2b,
        "store_ids": store_ids or [],
        "tenant_ids": tenant_ids or [],
        "kst_now": _now_kst().isoformat(),
    }


@router.get("/status")
def batch_status(secret: str = Query(...)):
    _verify_secret(secret)
    now_kst = _now_kst()
    return {
        "status": "ok",
        "kst_now": now_kst.isoformat(),
        "utc_now": datetime.now(timezone.utc).isoformat(),
        "is_last_day_of_month": _is_last_day_of_month(),
        "is_quarter_end_month": _is_quarter_end_month(),
    }


@router.post("/trigger/daily")
def trigger_daily(secret: str = Query(...)):
    _verify_secret(secret)
    return _run_precompute_batches(period_types=["1D"])


@router.post("/trigger/weekly")
def trigger_weekly(secret: str = Query(...)):
    _verify_secret(secret)
    return _run_precompute_batches(period_types=["7D"])


@router.post("/trigger/monthly")
def trigger_monthly(secret: str = Query(...)):
    _verify_secret(secret)
    now_kst = _now_kst()
    if not _is_last_day_of_month():
        return {"status": "skipped", "reason": "오늘은 말일이 아닙니다.", "kst_now": now_kst.isoformat()}
    return _run_precompute_batches(period_types=["30D"])


@router.post("/trigger/quarterly")
def trigger_quarterly(secret: str = Query(...)):
    _verify_secret(secret)
    now_kst = _now_kst()
    if not _is_last_day_of_month():
        return {"status": "skipped", "reason": "오늘은 말일이 아닙니다.", "kst_now": now_kst.isoformat()}
    if not _is_quarter_end_month():
        return {"status": "skipped", "reason": "이번 달은 분기 말월이 아닙니다.", "kst_now": now_kst.isoformat()}
    return _run_precompute_batches(period_types=["90D"])


@router.post("/trigger/yearly")
def trigger_yearly(secret: str = Query(...)):
    _verify_secret(secret)
    now_kst = _now_kst()
    if not (now_kst.month == 12 and now_kst.day == 31):
        return {"status": "skipped", "reason": "오늘은 12/31이 아닙니다.", "kst_now": now_kst.isoformat()}
    return _run_precompute_batches(period_types=["365D"])


@router.post("/trigger/period")
def trigger_period(
    secret: str = Query(...),
    period_type: str = Query(..., description="1D/7D/30D/90D/365D"),
    include_store: bool = Query(True),
    include_b2b: bool = Query(True),
    store_id: list[str] | None = Query(None),
    tenant_id: list[int] | None = Query(None),
):
    _verify_secret(secret)

    if period_type not in VALID_PERIOD_TYPES:
        raise HTTPException(status_code=400, detail="지원하지 않는 period_type 입니다.")
    if not include_store and not include_b2b:
        raise HTTPException(status_code=400, detail="include_store 또는 include_b2b 중 하나는 true여야 합니다.")

    return _run_precompute_batches(
        period_types=[period_type],
        store_ids=store_id,
        tenant_ids=tenant_id,
        include_store=include_store,
        include_b2b=include_b2b,
    )
