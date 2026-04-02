from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.service.tenant_news_service import collect_b2b_tenants_news
from sqlalchemy import text

router = APIRouter(prefix="/tenant-news", tags=["tenant-news"])


@router.post("/collect")
def run_tenant_news_collection(
    tenant_id: Optional[int] = Query(default=1),
    db: Session = Depends(get_db),
):
    return collect_b2b_tenants_news(db=db, only_tenant_id=tenant_id)

@router.get("/list")
def get_tenant_news_list(
    tenant_id: int = Query(...),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    sql = text("""
        select
            id,
            tenant_id,
            keyword,
            title,
            url,
            source,
            published_at,
            created_at
        from public.articles
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