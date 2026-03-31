from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid5, NAMESPACE_URL

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.collectors.naver_news_client import fetch_naver_news


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


def get_keywords_by_tenant(db: Session, tenant_id: int) -> List[Dict[str, Any]]:
    sql = text("""
        select id, keyword
        from public.keywords
        where tenant_id = :tenant_id
        order by id
    """)
    rows = db.execute(sql, {"tenant_id": tenant_id}).mappings().all()
    return [dict(r) for r in rows]


def make_article_uuid(tenant_id: int, url: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"{tenant_id}:{url}"))


def article_exists(db: Session, tenant_id: int, url: str) -> bool:
    sql = text("""
        select 1
        from public.articles
        where tenant_id = :tenant_id
          and url = :url
        limit 1
    """)
    row = db.execute(sql, {"tenant_id": tenant_id, "url": url}).first()
    return row is not None


def insert_article(db: Session, tenant_id: int, keyword: str, item: Dict[str, Any]) -> bool:
    url = item.get("url")
    if not url:
        return False

    if article_exists(db, tenant_id, url):
        return False

    now_utc = datetime.now(timezone.utc).isoformat()

    sql = text("""
        insert into public.articles (
            id,
            tenant_id,
            title,
            content,
            summary,
            url,
            source,
            keyword,
            company_name,
            published_at,
            collected_at,
            created_at
        )
        values (
            :id,
            :tenant_id,
            :title,
            :content,
            :summary,
            :url,
            :source,
            :keyword,
            :company_name,
            :published_at,
            :collected_at,
            :created_at
        )
    """)

    db.execute(
        sql,
        {
            "id": make_article_uuid(tenant_id, url),
            "tenant_id": tenant_id,
            "title": item.get("title"),
            "content": item.get("content"),
            "summary": item.get("summary"),
            "url": url,
            "source": item.get("source", "naver_news"),
            "keyword": keyword,
            "company_name": None,
            "published_at": item.get("published_at"),
            "collected_at": now_utc,
            "created_at": now_utc,
        },
    )
    return True


def collect_tenant_news(db: Session, tenant_id: int) -> Dict[str, Any]:
    keywords = get_keywords_by_tenant(db, tenant_id)

    total_keywords = len(keywords)
    total_fetched = 0
    total_inserted = 0

    for kw in keywords:
        keyword = kw["keyword"]
        items = fetch_naver_news(keyword)

        inserted = 0
        for item in items:
            ok = insert_article(db, tenant_id, keyword, item)
            if ok:
                inserted += 1

        total_fetched += len(items)
        total_inserted += inserted

    db.commit()

    return {
        "tenant_id": tenant_id,
        "keyword_count": total_keywords,
        "fetched_count": total_fetched,
        "inserted_count": total_inserted,
    }


def collect_b2b_tenants_news(db: Session, only_tenant_id: Optional[int] = None) -> Dict[str, Any]:
    tenants = get_b2b_tenants(db)

    if only_tenant_id is not None:
        tenants = [t for t in tenants if t["id"] == only_tenant_id]

    results = []

    for tenant in tenants:
        result = collect_tenant_news(db, tenant["id"])
        result["tenant_name"] = tenant["name"]
        results.append(result)

    return {
        "tenant_count": len(tenants),
        "results": results,
    }