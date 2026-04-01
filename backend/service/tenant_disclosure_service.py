from __future__ import annotations

from datetime import datetime, timezone, date, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.collectors.dart_client import fetch_dart_disclosures

B2B_TENANT_TYPE_CODE = "B2B"


def get_b2b_tenants(db: Session) -> List[Dict[str, Any]]:
    sql = text("""
        select id, name, tenant_type_code
        from public.tenants
        where tenant_type_code = :tenant_type_code
        order by id
    """)
    rows = db.execute(sql, {"tenant_type_code": B2B_TENANT_TYPE_CODE}).mappings().all()
    return [dict(r) for r in rows]


def get_disclosure_targets_by_tenant(db: Session, tenant_id: int) -> List[Dict[str, Any]]:
    """
    변경 기준:
    - managed_clients = 고객사
    - monitoring_targets(target_role='POTENTIAL') = 잠재고객
    - 둘만 실제 공시 수집 대상
    """
    sql = text("""
        with target_union as (
            select
                id as source_target_id,
                company_name,
                corp_code,
                null::text as stock_code,
                'CLIENT' as company_role,
                'managed_clients' as source_type
            from public.managed_clients
            where tenant_id = :tenant_id
              and corp_code is not null
              and trim(corp_code) <> ''

            union

            select
                id as source_target_id,
                company_name,
                corp_code,
                stock_code,
                'POTENTIAL' as company_role,
                'monitoring_targets' as source_type
            from public.monitoring_targets
            where tenant_id = :tenant_id
              and target_role = 'POTENTIAL'
              and status = 'ACTIVE'
              and is_active = true
              and corp_code is not null
              and trim(corp_code) <> ''
        )
        select distinct
            source_target_id,
            company_name,
            corp_code,
            stock_code,
            company_role,
            source_type
        from target_union
        order by company_name nulls last
    """)
    rows = db.execute(sql, {"tenant_id": tenant_id}).mappings().all()
    return [dict(r) for r in rows]


def disclosure_exists(db: Session, tenant_id: int, rcept_no: str) -> bool:
    sql = text("""
        select 1
        from public.dart_disclosures
        where tenant_id = :tenant_id
          and rcept_no = :rcept_no
        limit 1
    """)
    row = db.execute(sql, {"tenant_id": tenant_id, "rcept_no": rcept_no}).first()
    return row is not None


def build_dart_link(rcept_no: Optional[str]) -> Optional[str]:
    if not rcept_no:
        return None
    return f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}"


def insert_disclosure(
    db: Session,
    tenant_id: int,
    target: Dict[str, Any],
    item: Dict[str, Any],
) -> bool:
    rcept_no = item.get("rcept_no")
    if not rcept_no:
        return False

    if disclosure_exists(db, tenant_id, rcept_no):
        return False

    now_utc = datetime.now(timezone.utc).isoformat()

    sql = text("""
        insert into public.dart_disclosures (
            tenant_id,
            corp_code,
            corp_name,
            stock_code,
            report_nm,
            rcept_no,
            rcept_dt,
            flr_nm,
            rm,
            link,
            raw_payload,
            company_role,
            source_type,
            source_target_id,
            collected_at,
            created_at
        )
        values (
            :tenant_id,
            :corp_code,
            :corp_name,
            :stock_code,
            :report_nm,
            :rcept_no,
            :rcept_dt,
            :flr_nm,
            :rm,
            :link,
            cast(:raw_payload as jsonb),
            :company_role,
            :source_type,
            :source_target_id,
            :collected_at,
            :created_at
        )
    """)

    db.execute(
        sql,
        {
            "tenant_id": tenant_id,
            "corp_code": item.get("corp_code") or target.get("corp_code"),
            "corp_name": item.get("corp_name") or target.get("company_name"),
            "stock_code": item.get("stock_code") or target.get("stock_code"),
            "report_nm": item.get("report_nm"),
            "rcept_no": rcept_no,
            "rcept_dt": item.get("rcept_dt"),
            "flr_nm": item.get("flr_nm"),
            "rm": item.get("rm"),
            "link": build_dart_link(rcept_no),
            "raw_payload": __import__("json").dumps(item, ensure_ascii=False),
            "company_role": target.get("company_role"),
            "source_type": target.get("source_type"),
            "source_target_id": target.get("source_target_id"),
            "collected_at": now_utc,
            "created_at": now_utc,
        },
    )
    return True


def collect_tenant_disclosures(
    db: Session,
    tenant_id: int,
    days_back: int = 7,
    target_limit: Optional[int] = 5,
) -> Dict[str, Any]:
    targets = get_disclosure_targets_by_tenant(db, tenant_id)

    if target_limit is not None:
        targets = targets[:target_limit]

    bgn_de = (date.today() - timedelta(days=days_back)).strftime("%Y%m%d")
    end_de = date.today().strftime("%Y%m%d")

    total_targets = len(targets)
    total_fetched = 0
    total_inserted = 0
    inserted_since_commit = 0

    for target in targets:
        corp_code = target.get("corp_code")
        if not corp_code:
            continue

        items = fetch_dart_disclosures(
            corp_code=corp_code,
            bgn_de=bgn_de,
            end_de=end_de,
        )

        inserted = 0
        for item in items:
            ok = insert_disclosure(db, tenant_id, target, item)
            if ok:
                inserted += 1
                inserted_since_commit += 1

                if inserted_since_commit >= 10:
                    db.commit()
                    inserted_since_commit = 0

        total_fetched += len(items)
        total_inserted += inserted

    db.commit()

    return {
        "tenant_id": tenant_id,
        "target_count": total_targets,
        "fetched_count": total_fetched,
        "inserted_count": total_inserted,
        "days_back": days_back,
    }


def collect_b2b_tenants_disclosures(
    db: Session,
    only_tenant_id: Optional[int] = None,
    days_back: int = 7,
    target_limit: Optional[int] = 5,
) -> Dict[str, Any]:
    tenants = get_b2b_tenants(db)

    if only_tenant_id is not None:
        tenants = [t for t in tenants if t["id"] == only_tenant_id]

    results = []

    for tenant in tenants:
        result = collect_tenant_disclosures(
            db=db,
            tenant_id=tenant["id"],
            days_back=days_back,
            target_limit=target_limit,
        )
        result["tenant_name"] = tenant["name"]
        results.append(result)

    return {
        "tenant_count": len(tenants),
        "results": results,
    }