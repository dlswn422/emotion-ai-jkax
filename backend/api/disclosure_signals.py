from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.service.disclosure_candidate_service import get_candidates
from backend.service.disclosure_signal_service import create_signals_from_candidates

router = APIRouter(prefix="/disclosure-signals", tags=["disclosure-signals"])


@router.post("/generate")
def generate_disclosure_signals(
    tenant_id: int = Query(...),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    candidates = get_candidates(
        db=db,
        tenant_id=tenant_id,
        limit=limit,
    )

    result = create_signals_from_candidates(
        db=db,
        tenant_id=tenant_id,
        candidates=candidates,
    )

    return {
        "tenant_id": tenant_id,
        "candidate_count": len(candidates),
        "inserted_count": result["inserted_count"],
        "skipped_count": result["skipped_count"],
    }