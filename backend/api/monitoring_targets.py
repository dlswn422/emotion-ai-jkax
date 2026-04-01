from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.service.monitoring_target_service import collect_monitoring_targets_from_news
router = APIRouter(prefix="/monitoring-targets", tags=["monitoring-targets"])


@router.get("/list")
def get_monitoring_targets(
    tenant_id: int = Query(...),
    target_role: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    sql = """
        select
            id,
            tenant_id,
            company_name,
            normalized_company_name,
            corp_code,
            stock_code,
            business_no,
            target_role,
            status,
            source_type,
            source_ref_id,
            source_note,
            first_seen_at,
            last_seen_at,
            mention_count,
            promoted_at,
            promoted_by,
            is_active,
            created_at,
            updated_at
        from public.monitoring_targets
        where tenant_id = :tenant_id
    """

    params = {"tenant_id": tenant_id, "limit": limit}

    if target_role:
        sql += " and target_role = :target_role"
        params["target_role"] = target_role

    if status:
        sql += " and status = :status"
        params["status"] = status

    sql += """
        order by
            case when target_role = 'POTENTIAL' then 0 else 1 end,
            last_seen_at desc nulls last,
            id desc
        limit :limit
    """

    rows = db.execute(text(sql), params).mappings().all()

    return {
        "tenant_id": tenant_id,
        "count": len(rows),
        "items": [dict(r) for r in rows],
    }

@router.post("/promote")
def promote_monitoring_target(
    target_id: int = Query(...),
    promoted_by: str = Query(default="manual"),
    db: Session = Depends(get_db),
):
    sql = text("""
        update public.monitoring_targets
        set
            target_role = 'POTENTIAL',
            promoted_at = now(),
            promoted_by = :promoted_by,
            updated_at = now()
        where id = :target_id
        returning
            id,
            tenant_id,
            company_name,
            corp_code,
            target_role,
            promoted_at,
            promoted_by
    """)

    row = db.execute(sql, {"target_id": target_id, "promoted_by": promoted_by}).mappings().first()
    db.commit()

    if not row:
        return {
            "ok": False,
            "message": "target not found"
        }

    return {
        "ok": True,
        "item": dict(row)
    }

@router.post("/archive")
def archive_monitoring_target(
    target_id: int = Query(...),
    db: Session = Depends(get_db),
):
    sql = text("""
        update public.monitoring_targets
        set
            status = 'ARCHIVED',
            is_active = false,
            updated_at = now()
        where id = :target_id
        returning id, tenant_id, company_name, target_role, status, is_active
    """)

    row = db.execute(sql, {"target_id": target_id}).mappings().first()
    db.commit()

    if not row:
        return {"ok": False, "message": "target not found"}

    return {"ok": True, "item": dict(row)}

@router.get("/list")
def get_monitoring_targets(
    tenant_id: int = Query(...),
    target_role: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    sql = """
        select
            id,
            tenant_id,
            company_name,
            normalized_company_name,
            corp_code,
            stock_code,
            business_no,
            target_role,
            status,
            source_type,
            source_ref_id,
            source_note,
            first_seen_at,
            last_seen_at,
            mention_count,
            promoted_at,
            promoted_by,
            is_active,
            created_at,
            updated_at
        from public.monitoring_targets
        where tenant_id = :tenant_id
    """

    params = {"tenant_id": tenant_id, "limit": limit}

    if target_role:
        sql += " and target_role = :target_role"
        params["target_role"] = target_role

    if status:
        sql += " and status = :status"
        params["status"] = status

    sql += """
        order by
            case when target_role = 'POTENTIAL' then 0 else 1 end,
            last_seen_at desc nulls last,
            id desc
        limit :limit
    """

    rows = db.execute(text(sql), params).mappings().all()

    return {
        "tenant_id": tenant_id,
        "count": len(rows),
        "items": [dict(r) for r in rows],
    }


@router.post("/promote")
def promote_monitoring_target(
    target_id: int = Query(...),
    promoted_by: str = Query(default="manual"),
    db: Session = Depends(get_db),
):
    sql = text("""
        update public.monitoring_targets
        set
            target_role = 'POTENTIAL',
            promoted_at = now(),
            promoted_by = :promoted_by,
            updated_at = now()
        where id = :target_id
        returning
            id,
            tenant_id,
            company_name,
            corp_code,
            target_role,
            promoted_at,
            promoted_by
    """)

    row = db.execute(sql, {"target_id": target_id, "promoted_by": promoted_by}).mappings().first()
    db.commit()

    if not row:
        return {"ok": False, "message": "target not found"}

    return {"ok": True, "item": dict(row)}


@router.post("/collect-from-news")
def collect_from_news(
    tenant_id: int = Query(...),
    article_limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return collect_monitoring_targets_from_news(
        db=db,
        tenant_id=tenant_id,
        article_limit=article_limit,
    )

