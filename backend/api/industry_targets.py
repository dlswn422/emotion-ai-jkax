from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.service.industry_target_service import collect_industry_targets_from_dart_master

router = APIRouter(prefix="/industry-targets", tags=["industry-targets"])


@router.post("/collect-from-dart-master")
def collect_from_dart_master(
    tenant_id: int = Query(...),
    chunk_size: int = Query(default=1200, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    return collect_industry_targets_from_dart_master(
        db=db,
        tenant_id=tenant_id,
        chunk_size=chunk_size,
    )