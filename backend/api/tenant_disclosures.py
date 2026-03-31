from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.service.tenant_disclosure_service import collect_b2b_tenants_disclosures

router = APIRouter(prefix="/tenant-disclosures", tags=["tenant-disclosures"])


@router.post("/collect")
def run_tenant_disclosure_collection(
    tenant_id: Optional[int] = Query(default=1),
    days_back: int = Query(default=7, ge=1, le=365),
    target_limit: Optional[int] = Query(default=5),
    db: Session = Depends(get_db),
):
    return collect_b2b_tenants_disclosures(
        db=db,
        only_tenant_id=tenant_id,
        days_back=days_back,
        target_limit=target_limit,
    )