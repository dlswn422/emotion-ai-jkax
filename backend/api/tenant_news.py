from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.service.tenant_news_service import collect_b2b_tenants_news

router = APIRouter(prefix="/tenant-news", tags=["tenant-news"])


@router.post("/collect")
def run_tenant_news_collection(
    tenant_id: Optional[int] = Query(default=1),
    db: Session = Depends(get_db),
):
    return collect_b2b_tenants_news(db=db, only_tenant_id=tenant_id)