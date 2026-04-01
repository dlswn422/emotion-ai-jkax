from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session


def normalize_company_name(name: Optional[str]) -> Optional[str]:
    if not name:
        return None
    return (
        name.replace("(주)", "")
            .replace("주식회사", "")
            .replace("㈜", "")
            .strip()
            .lower()
    )


def get_company_candidates_by_tenant(db: Session, tenant_id: int) -> List[Dict[str, Any]]:
    """
    뉴스 본문/제목에서 매칭할 회사 후보 풀
    우선은 managed_clients + industry_targets 를 사용
    """
    sql = text("""
        with company_pool as (
            select
                company_name,
                corp_code,
                'MANAGED' as source_type,
                id as source_ref_id
            from public.managed_clients
            where tenant_id = :tenant_id

            union

            select
                company_name,
                corp_code,
                'INDUSTRY' as source_type,
                id as source_ref_id
            from public.industry_targets
            where tenant_id = :tenant_id
        )
        select distinct company_name, corp_code, source_type, source_ref_id
        from company_pool
        where company_name is not null
    """)
    rows = db.execute(sql, {"tenant_id": tenant_id}).mappings().all()

    results = []
    for r in rows:
        item = dict(r)
        item["normalized_company_name"] = normalize_company_name(item["company_name"])
        results.append(item)
    return results


def get_recent_articles_by_tenant(db: Session, tenant_id: int, limit: int = 100) -> List[Dict[str, Any]]:
    sql = text("""
        select
            id,
            tenant_id,
            keyword,
            title,
            content,
            source,
            url,
            published_at,
            created_at
        from public.articles
        where tenant_id = :tenant_id
        order by created_at desc
        limit :limit
    """)
    rows = db.execute(sql, {"tenant_id": tenant_id, "limit": limit}).mappings().all()
    return [dict(r) for r in rows]


def find_companies_in_article(article: Dict[str, Any], company_pool: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    text_blob = f"{article.get('title') or ''} {article.get('content') or ''}".lower()

    matched = []
    seen = set()

    for company in company_pool:
        normalized_name = company.get("normalized_company_name")
        if not normalized_name:
            continue

        if normalized_name in text_blob and normalized_name not in seen:
            matched.append(company)
            seen.add(normalized_name)

    return matched


def get_existing_monitoring_target(
    db: Session,
    tenant_id: int,
    corp_code: Optional[str],
    normalized_company_name: Optional[str],
) -> Optional[Dict[str, Any]]:
    if corp_code:
        sql = text("""
            select *
            from public.monitoring_targets
            where tenant_id = :tenant_id
              and corp_code = :corp_code
            limit 1
        """)
        row = db.execute(sql, {"tenant_id": tenant_id, "corp_code": corp_code}).mappings().first()
        if row:
            return dict(row)

    if normalized_company_name:
        sql = text("""
            select *
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
        ).mappings().first()
        if row:
            return dict(row)

    return None


def upsert_monitoring_target_from_news(
    db: Session,
    tenant_id: int,
    company: Dict[str, Any],
    article: Dict[str, Any],
) -> bool:
    company_name = company.get("company_name")
    normalized_company_name = company.get("normalized_company_name")
    corp_code = company.get("corp_code")

    existing = get_existing_monitoring_target(
        db=db,
        tenant_id=tenant_id,
        corp_code=corp_code,
        normalized_company_name=normalized_company_name,
    )

    now_utc = datetime.now(timezone.utc).isoformat()

    if existing:
        sql = text("""
            update public.monitoring_targets
            set
                last_seen_at = :last_seen_at,
                mention_count = coalesce(mention_count, 0) + 1,
                updated_at = :updated_at
            where id = :id
        """)
        db.execute(
            sql,
            {
                "id": existing["id"],
                "last_seen_at": now_utc,
                "updated_at": now_utc,
            },
        )
        return False

    sql = text("""
        insert into public.monitoring_targets (
            tenant_id,
            company_name,
            normalized_company_name,
            corp_code,
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
            "target_role": "GENERAL",
            "status": "ACTIVE",
            "source_type": "NEWS",
            "source_ref_id": article.get("id"),
            "source_note": f"Matched from article keyword={article.get('keyword')}",
            "first_seen_at": now_utc,
            "last_seen_at": now_utc,
            "mention_count": 1,
            "is_active": True,
            "created_at": now_utc,
            "updated_at": now_utc,
        },
    )
    return True


def collect_monitoring_targets_from_news(
    db: Session,
    tenant_id: int,
    article_limit: int = 100,
) -> Dict[str, Any]:
    company_pool = get_company_candidates_by_tenant(db, tenant_id)
    articles = get_recent_articles_by_tenant(db, tenant_id, limit=article_limit)

    total_articles = len(articles)
    total_matches = 0
    inserted_count = 0
    updated_count = 0

    touched = 0

    for article in articles:
        matched_companies = find_companies_in_article(article, company_pool)
        total_matches += len(matched_companies)

        for company in matched_companies:
            inserted = upsert_monitoring_target_from_news(db, tenant_id, company, article)
            if inserted:
                inserted_count += 1
            else:
                updated_count += 1

            touched += 1
            if touched % 20 == 0:
                db.commit()

    db.commit()

    return {
        "tenant_id": tenant_id,
        "article_count": total_articles,
        "matched_company_count": total_matches,
        "inserted_count": inserted_count,
        "updated_count": updated_count,
    }