from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.service.news_candidate_service import get_news_candidates
from backend.service.news_signal_service import create_news_signals

router = APIRouter(prefix="/news-signals", tags=["news-signals"])


@router.post("/generate")
def generate_news_signals(
    tenant_id: int = Query(...),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    candidates = get_news_candidates(
        db=db,
        tenant_id=tenant_id,
        limit=limit,
    )

    result = create_news_signals(
        db=db,
        tenant_id=tenant_id,
        candidates=candidates,
    )

    return {
        "tenant_id": tenant_id,
        "candidate_count": len(candidates),
        "inserted_count": result["inserted_count"],
        "skipped_count": result["skipped_count"],
        "matched_company_count": result["matched_company_count"],
    }