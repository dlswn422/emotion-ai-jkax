from __future__ import annotations

import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/batch", tags=["batch"])

BATCH_SECRET = os.getenv("BATCH_SECRET", "")
KST = ZoneInfo("Asia/Seoul")


def _verify_secret(secret: str) -> None:
    if not BATCH_SECRET:
        raise HTTPException(status_code=500, detail="BATCH_SECRET 환경변수가 설정되지 않았습니다.")
    if secret != BATCH_SECRET:
        raise HTTPException(status_code=401, detail="인증 실패: 잘못된 secret입니다.")


def _now_kst() -> datetime:
    return datetime.now(KST)


def _is_last_day_of_month() -> bool:
    from calendar import monthrange
    now = _now_kst()
    return now.day == monthrange(now.year, now.month)[1]


def _is_quarter_end_month() -> bool:
    return _now_kst().month in (3, 6, 9, 12)


# ──────────────────────────────────────────
# 배치 실행 (동기) — 실패 시 예외 발생
# ──────────────────────────────────────────

def _run_all_batches_sync(period_types: list[str]) -> dict:
    """
    store + b2b 배치 순차 동기 실행.
    하나라도 실패하면 HTTPException 500으로 올라가서
    GitHub Actions가 실패로 인식함.
    """
    errors = []

    # store 배치
    try:
        from backend.batch.run_store_analysis_batch import run_store_analysis_batch
        print(f"[batch-trigger] store batch 시작: periods={period_types}")
        run_store_analysis_batch(period_types=period_types)
        print(f"[batch-trigger] store batch 완료: periods={period_types}")
    except Exception as e:
        msg = f"store batch 실패: {e}"
        print(f"[batch-trigger] ❌ {msg}")
        errors.append(msg)

    # b2b 배치
    try:
        from backend.batch.run_b2b_dashboard_batch import run_b2b_dashboard_batch
        print(f"[batch-trigger] b2b batch 시작: periods={period_types}")
        run_b2b_dashboard_batch(period_types=period_types)
        print(f"[batch-trigger] b2b batch 완료: periods={period_types}")
    except Exception as e:
        msg = f"b2b batch 실패: {e}"
        print(f"[batch-trigger] ❌ {msg}")
        errors.append(msg)

    if errors:
        raise HTTPException(
            status_code=500,
            detail=" | ".join(errors),
        )

    return {"status": "success", "periods": period_types, "kst_now": _now_kst().isoformat()}


# ──────────────────────────────────────────
# 엔드포인트
# ──────────────────────────────────────────

@router.post("/trigger/daily")
def trigger_daily(secret: str = Query(...)):
    """일별 배치 트리거 (매일 새벽 2시 KST) — 1D"""
    _verify_secret(secret)
    return _run_all_batches_sync(["1D"])


@router.post("/trigger/weekly")
def trigger_weekly(secret: str = Query(...)):
    """주별 배치 트리거 (일요일 새벽 2시 KST) — 7D"""
    _verify_secret(secret)
    return _run_all_batches_sync(["7D"])


@router.post("/trigger/monthly")
def trigger_monthly(secret: str = Query(...)):
    """월별 배치 트리거 (매월 말일 새벽 2시 KST) — 30D"""
    _verify_secret(secret)

    now_kst = _now_kst()
    if not _is_last_day_of_month():
        return {"status": "skipped", "reason": "오늘은 말일이 아닙니다.", "kst_now": now_kst.isoformat()}

    return _run_all_batches_sync(["30D"])


@router.post("/trigger/quarterly")
def trigger_quarterly(secret: str = Query(...)):
    """분기별 배치 트리거 (3/31, 6/30, 9/30, 12/31 새벽 2시 KST) — 90D"""
    _verify_secret(secret)

    now_kst = _now_kst()
    if not _is_last_day_of_month():
        return {"status": "skipped", "reason": "오늘은 말일이 아닙니다.", "kst_now": now_kst.isoformat()}
    if not _is_quarter_end_month():
        return {"status": "skipped", "reason": "이번 달은 분기 말월이 아닙니다.", "kst_now": now_kst.isoformat()}

    return _run_all_batches_sync(["90D"])


@router.post("/trigger/yearly")
def trigger_yearly(secret: str = Query(...)):
    """연별 배치 트리거 (12/31 새벽 2시 KST) — 365D"""
    _verify_secret(secret)

    now_kst = _now_kst()
    if not (now_kst.month == 12 and now_kst.day == 31):
        return {"status": "skipped", "reason": "오늘은 12/31이 아닙니다.", "kst_now": now_kst.isoformat()}

    return _run_all_batches_sync(["365D"])


@router.get("/status")
def batch_status(secret: str = Query(...)):
    """배치 트리거 헬스체크"""
    _verify_secret(secret)
    now_kst = _now_kst()
    return {
        "status": "ok",
        "kst_now": now_kst.isoformat(),
        "utc_now": datetime.now(timezone.utc).isoformat(),
        "is_last_day_of_month": _is_last_day_of_month(),
        "is_quarter_end_month": _is_quarter_end_month(),
    }
