from __future__ import annotations

from typing import Any, Dict, List

from sqlalchemy import text
from sqlalchemy.orm import Session


PROMOTION_KEYWORDS = [
    "신규시설",
    "신규 시설",
    "유상증자",
    "투자",
    "증설",
    "시설투자",
    "시설 투자",
    "생산능력",
    "공장",
    "설비",
    "신제품",
    "신사업",
]


def get_general_targets(
    db: Session,
    tenant_id: int,
    limit: int = 5000,
) -> List[Dict[str, Any]]:
    sql = text("""
        select
            id,
            tenant_id,
            company_name,
            corp_code,
            source_type,
            target_role,
            status,
            is_active
        from public.monitoring_targets
        where tenant_id = :tenant_id
          and target_role = 'GENERAL'
          and status = 'ACTIVE'
          and is_active = true
          and source_type = 'INDUSTRY'
          and corp_code is not null
          and trim(corp_code) <> ''
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

    return [dict(r) for r in rows]


def find_matching_disclosure_keyword(
    db: Session,
    tenant_id: int,
    corp_code: str,
) -> str | None:
    sql = text("""
        select
            report_nm
        from public.dart_disclosures
        where tenant_id = :tenant_id
          and corp_code = :corp_code
        order by created_at desc nulls last, id desc
        limit 30
    """)

    rows = db.execute(
        sql,
        {
            "tenant_id": tenant_id,
            "corp_code": corp_code,
        },
    ).mappings().all()

    for row in rows:
        report_nm = (row.get("report_nm") or "").strip()
        for keyword in PROMOTION_KEYWORDS:
            if keyword in report_nm:
                return keyword

    return None


def promote_target(
    db: Session,
    target_id: int,
    promoted_by: str,
    promotion_note: str,
) -> None:
    sql = text("""
        update public.monitoring_targets
        set
            target_role = 'POTENTIAL',
            promoted_at = now(),
            promoted_by = :promoted_by,
            source_note = coalesce(source_note, '') || :promotion_note,
            updated_at = now()
        where id = :target_id
    """)
    db.execute(
        sql,
        {
            "target_id": target_id,
            "promoted_by": promoted_by,
            "promotion_note": f" | auto-promoted: {promotion_note}",
        },
    )


def auto_promote_monitoring_targets(
    db: Session,
    tenant_id: int,
    limit: int = 500,
) -> Dict[str, Any]:
    targets = get_general_targets(db, tenant_id, limit=limit)

    promoted_count = 0
    skipped_count = 0
    touched = 0
    promoted_items = []

    for target in targets:
        corp_code = target.get("corp_code")
        if not corp_code:
            skipped_count += 1
            continue

        matched_keyword = find_matching_disclosure_keyword(
            db=db,
            tenant_id=tenant_id,
            corp_code=corp_code,
        )

        if not matched_keyword:
            skipped_count += 1
            continue

        promote_target(
            db=db,
            target_id=target["id"],
            promoted_by="auto_disclosure_rule",
            promotion_note=f"dart keyword matched: {matched_keyword}",
        )

        promoted_count += 1
        promoted_items.append(
            {
                "id": target["id"],
                "company_name": target["company_name"],
                "corp_code": corp_code,
                "matched_keyword": matched_keyword,
            }
        )

        touched += 1
        if touched % 20 == 0:
            db.commit()

    db.commit()

    return {
        "tenant_id": tenant_id,
        "checked_count": len(targets),
        "promoted_count": promoted_count,
        "skipped_count": skipped_count,
        "items": promoted_items,
    }