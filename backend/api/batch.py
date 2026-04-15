from __future__ import annotations

import os

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.service.review_signal_service import run_analyze_reviews_batch

router = APIRouter(prefix="/batch", tags=["batch"])

BATCH_SECRET = os.getenv("BATCH_SECRET", "")


def _verify_secret(secret: str = Query(..., description="배치 실행 인증 키")) -> None:
    if not BATCH_SECRET:
        raise HTTPException(status_code=500, detail="BATCH_SECRET 환경변수가 설정되지 않았습니다.")
    if secret != BATCH_SECRET:
        raise HTTPException(status_code=403, detail="인증 실패")


@router.get("/status")
def batch_status(secret: str = Query(...), _: None = Depends(_verify_secret)):
    """
    GitHub Actions 서버 웜업용 헬스체크 엔드포인트.
    """
    return {"status": "ok"}


@router.post("/trigger/analyze-reviews")
def trigger_analyze_reviews(
    tenant_id: int = Query(..., description="대상 tenant_id"),
    store_id: str = Query(default="store7", description="대상 store_id"),
    _: None = Depends(_verify_secret),
    db: Session = Depends(get_db),
):
    """
    google_reviews (is_analyzed='N') → signals + notifications 적재 배치.

    GitHub Actions에서 하루 1회 호출.
    실패 건이 있어도 200 반환 (failed 카운트로 확인).
    전체 배치 자체가 실패하면 500 반환.
    """
    try:
        stats = run_analyze_reviews_batch(db=db, store_id=store_id, tenant_id=tenant_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"배치 실행 중 오류 발생: {e}")

    return {
        "status": "completed",
        "store_id": store_id,
        "tenant_id": tenant_id,
        "result": stats,
    }