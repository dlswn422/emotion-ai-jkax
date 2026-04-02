from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.service.tenant_disclosure_service import collect_b2b_tenants_disclosures
from sqlalchemy import text

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

@router.get("/list")
def get_tenant_disclosure_list(
    tenant_id: int = Query(...),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    sql = text("""
        select
            id,
            tenant_id,
            corp_name,
            report_nm,
            rcept_no,
            rcept_dt,
            link,
            created_at
        from public.dart_disclosures
        where tenant_id = :tenant_id
        order by created_at desc
        limit :limit
    """)
    rows = db.execute(sql, {"tenant_id": tenant_id, "limit": limit}).mappings().all()
    return {
        "tenant_id": tenant_id,
        "count": len(rows),
        "items": [dict(r) for r in rows],
    }