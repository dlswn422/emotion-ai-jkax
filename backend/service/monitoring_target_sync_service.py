from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from sqlalchemy import text
from sqlalchemy.orm import Session


def normalize_company_name(name: str | None) -> str | None:
    if not name:
        return None
    return (
        name.replace("(주)", "")
        .replace("주식회사", "")
        .replace("㈜", "")
        .strip()
        .lower()
    )


def monitoring_target_exists(
    db: Session,
    tenant_id: int,
    corp_code: str | None,
    normalized_company_name: str | None,
) -> bool:
    if corp_code:
        sql = text("""
            select 1
            from public.monitoring_targets
            where tenant_id = :tenant_id
              and corp_code = :corp_code
            limit 1
        """)
        row = db.execute(
            sql,
            {
                "tenant_id": tenant_id,
                "corp_code": corp_code,
            },
        ).first()
        if row:
            return True

    if normalized_company_name:
        sql = text("""
            select 1
            from public.monitoring_targets
            where tenant_id = :tenant_id
              and normalized_company_name = :normalized_company_name
            limit 1
        """)
        row = db.execute(
            sql,
            {
                "tenant_id": tenant_id,
                "normalized_company_name": normalized_company_name,
            },
        ).first()
        if row:
            return True

    return False


def insert_monitoring_target_from_industry(
    db: Session,
    tenant_id: int,
    item: Dict[str, Any],
) -> bool:
    company_name = item.get("company_name")
    corp_code = item.get("corp_code")
    business_no = item.get("business_no")
    normalized_company_name = normalize_company_name(company_name)
    now_utc = datetime.now(timezone.utc).isoformat()

    exists = monitoring_target_exists(
        db=db,
        tenant_id=tenant_id,
        corp_code=corp_code,
        normalized_company_name=normalized_company_name,
    )
    if exists:
        return False

    sql = text("""
        insert into public.monitoring_targets (
            tenant_id,
            company_name,
            normalized_company_name,
            corp_code,
            business_no,
            target_role,
            status,
            source_type,
            source_ref_id,
            source_note,
            first_seen_at,
            last_seen_at,
            mention_count,
            is_active,
            created_at,
            updated_at
        )
        values (
            :tenant_id,
            :company_name,
            :normalized_company_name,
            :corp_code,
            :business_no,
            :target_role,
            :status,
            :source_type,
            :source_ref_id,
            :source_note,
            :first_seen_at,
            :last_seen_at,
            :mention_count,
            :is_active,
            :created_at,
            :updated_at
        )
    """)

    db.execute(
        sql,
        {
            "tenant_id": tenant_id,
            "company_name": company_name,
            "normalized_company_name": normalized_company_name,
            "corp_code": corp_code,
            "business_no": business_no,
            "target_role": "GENERAL",
            "status": "ACTIVE",
            "source_type": "INDUSTRY",
            "source_ref_id": None,
            "source_note": f"Synced from industry_targets id={item.get('id')}",
            "first_seen_at": now_utc,
            "last_seen_at": now_utc,
            "mention_count": 0,
            "is_active": True,
            "created_at": now_utc,
            "updated_at": now_utc,
        },
    )
    return True


def sync_industry_targets_to_monitoring_targets(
    db: Session,
    tenant_id: int,
    limit: int = 500,
) -> Dict[str, Any]:
    sql = text("""
        select
            id,
            tenant_id,
            company_name,
            corp_code,
            business_no,
            ksic_code,
            ksic_name,
            created_at,
            updated_at
        from public.industry_targets
        where tenant_id = :tenant_id
        order by id asc
        limit :limit
    """)

    rows = db.execute(
        sql,
        {
            "tenant_id": tenant_id,
            "limit": limit,
        },
    ).mappings().all()

    inserted_count = 0
    skipped_count = 0
    touched = 0

    for row in rows:
        ok = insert_monitoring_target_from_industry(
            db=db,
            tenant_id=tenant_id,
            item=dict(row),
        )
        if ok:
            inserted_count += 1
        else:
            skipped_count += 1

        touched += 1
        if touched % 50 == 0:
            db.commit()

    db.commit()

    return {
        "tenant_id": tenant_id,
        "checked_count": len(rows),
        "inserted_count": inserted_count,
        "skipped_count": skipped_count,
    }