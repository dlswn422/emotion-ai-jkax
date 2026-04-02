from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.service.disclosure_candidate_service import get_candidates

router = APIRouter(prefix="/disclosure-candidates", tags=["disclosure-candidates"])


@router.get("/list")
def list_disclosure_candidates(
    tenant_id: int = Query(...),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    items = get_candidates(db=db, tenant_id=tenant_id, limit=limit)

    return {
        "tenant_id": tenant_id,
        "count": len(items),
        "items": items,
    }