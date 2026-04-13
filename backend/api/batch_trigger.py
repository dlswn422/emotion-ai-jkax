from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

router = APIRouter(prefix="/batch", tags=["batch"])

BATCH_SECRET = os.getenv("BATCH_SECRET", "")


def _verify_secret(secret: str) -> None:
    if not BATCH_SECRET:
        raise HTTPException(status_code=500, detail="BATCH_SECRET 환경변수가 설정되지 않았습니다.")
    if secret != BATCH_SECRET:
        raise HTTPException(status_code=401, detail="인증 실패: 잘못된 secret입니다.")


def _is_last_day_of_month() -> bool:
    """오늘이 해당 월의 말일인지 확인"""
    from calendar import monthrange
    now = datetime.now(timezone.utc)
    last_day = monthrange(now.year, now.month)[1]
    return now.day == last_day


def _is_quarter_end_month() -> bool:
    """현재 월이 분기 말월(3, 6, 9, 12)인지 확인"""
    now = datetime.now(timezone.utc)
    return now.month in (3, 6, 9, 12)


# ──────────────────────────────────────────
# 매장 분석 배치
# ──────────────────────────────────────────

def _run_store_batch(period_types: list[str]) -> None:
    try:
        from backend.batch.run_store_analysis_batch import run_store_analysis_batch
        print(f"[batch-trigger] store batch 시작: periods={period_types}")
        run_store_analysis_batch(period_types=period_types)
        print(f"[batch-trigger] store batch 완료: periods={period_types}")
    except Exception as e:
        print(f"[batch-trigger] store batch 오류: {e}")


# ──────────────────────────────────────────
# B2B 배치
# ──────────────────────────────────────────

def _run_b2b_batch(period_types: list[str]) -> None:
    try:
        from backend.batch.run_b2b_dashboard_batch import run_b2b_dashboard_batch
        print(f"[batch-trigger] b2b batch 시작: periods={period_types}")
        run_b2b_dashboard_batch(period_types=period_types)
        print(f"[batch-trigger] b2b batch 완료: periods={period_types}")
    except Exception as e:
        print(f"[batch-trigger] b2b batch 오류: {e}")


# ──────────────────────────────────────────
# 엔드포인트
# ──────────────────────────────────────────

@router.post("/trigger/daily")
def trigger_daily(
    background_tasks: BackgroundTasks,
    secret: str = Query(...),
):
    """
    일별 배치 트리거 (매일 새벽 2시 KST)
    - 1D 기간 캐시 갱신
    """
    _verify_secret(secret)
    background_tasks.add_task(_run_store_batch, ["1D"])
    background_tasks.add_task(_run_b2b_batch, ["1D"])
    return {"status": "triggered", "schedule": "daily", "periods": ["1D"]}


@router.post("/trigger/weekly")
def trigger_weekly(
    background_tasks: BackgroundTasks,
    secret: str = Query(...),
):
    """
    주별 배치 트리거 (일요일 새벽 2시 KST)
    - 7D 기간 캐시 갱신
    """
    _verify_secret(secret)
    background_tasks.add_task(_run_store_batch, ["7D"])
    background_tasks.add_task(_run_b2b_batch, ["7D"])
    return {"status": "triggered", "schedule": "weekly", "periods": ["7D"]}


@router.post("/trigger/monthly")
def trigger_monthly(
    background_tasks: BackgroundTasks,
    secret: str = Query(...),
):
    """
    월별 배치 트리거 (매월 말일 새벽 2시 KST)
    - 말일 여부를 내부에서 검증 후 30D 캐시 갱신
    """
    _verify_secret(secret)

    if not _is_last_day_of_month():
        return {"status": "skipped", "reason": "오늘은 말일이 아닙니다."}

    background_tasks.add_task(_run_store_batch, ["30D"])
    background_tasks.add_task(_run_b2b_batch, ["30D"])
    return {"status": "triggered", "schedule": "monthly", "periods": ["30D"]}


@router.post("/trigger/quarterly")
def trigger_quarterly(
    background_tasks: BackgroundTasks,
    secret: str = Query(...),
):
    """
    분기별 배치 트리거 (3/31, 6/30, 9/30, 12/31 새벽 2시 KST)
    - 말일 + 분기 말월 여부 검증 후 90D 캐시 갱신
    """
    _verify_secret(secret)

    if not _is_last_day_of_month():
        return {"status": "skipped", "reason": "오늘은 말일이 아닙니다."}

    if not _is_quarter_end_month():
        return {"status": "skipped", "reason": "이번 달은 분기 말월이 아닙니다."}

    background_tasks.add_task(_run_store_batch, ["90D"])
    background_tasks.add_task(_run_b2b_batch, ["90D"])
    return {"status": "triggered", "schedule": "quarterly", "periods": ["90D"]}


@router.post("/trigger/yearly")
def trigger_yearly(
    background_tasks: BackgroundTasks,
    secret: str = Query(...),
):
    """
    연별 배치 트리거 (12/31 새벽 2시 KST)
    - 180D, 365D 캐시 갱신
    """
    _verify_secret(secret)

    now = datetime.now(timezone.utc)
    if not (now.month == 12 and now.day == 31):
        return {"status": "skipped", "reason": "오늘은 12/31이 아닙니다."}

    background_tasks.add_task(_run_store_batch, ["180D", "365D"])
    background_tasks.add_task(_run_b2b_batch, ["180D", "365D"])
    return {"status": "triggered", "schedule": "yearly", "periods": ["180D", "365D"]}


@router.get("/status")
def batch_status(secret: str = Query(...)):
    """
    배치 트리거 헬스체크
    """
    _verify_secret(secret)
    now = datetime.now(timezone.utc)
    return {
        "status": "ok",
        "utc_now": now.isoformat(),
        "is_last_day_of_month": _is_last_day_of_month(),
        "is_quarter_end_month": _is_quarter_end_month(),
    }