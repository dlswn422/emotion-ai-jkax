from __future__ import annotations

from typing import Dict, List, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.service.llm_signal_classifier import classify_signal_with_llm
from backend.service.signal_classifier import classify_signal


def normalize_company_name(name: str | None) -> str:
    if not name:
        return ""
    return (
        name.replace("(주)", "")
        .replace("주식회사", "")
        .replace("㈜", "")
        .strip()
    )


def signal_exists(
    db: Session,
    tenant_id: int,
    source: str,
    source_id: str,
) -> bool:
    row = db.execute(
        text("""
            select 1
            from public.signals
            where tenant_id = :tenant_id
              and source = :source
              and source_id = :source_id
            limit 1
        """),
        {
            "tenant_id": tenant_id,
            "source": source,
            "source_id": source_id,
        },
    ).first()

    return row is not None


def get_monitoring_target_companies(db: Session, tenant_id: int) -> List[dict]:
    rows = db.execute(
        text("""
            select
                company_name,
                corp_code
            from public.monitoring_targets
            where tenant_id = :tenant_id
              and is_active = true
              and company_name is not null
            order by length(company_name) desc
        """),
        {"tenant_id": tenant_id},
    ).mappings().all()

    return [dict(r) for r in rows]


def find_company_name_from_article(
    article_text: str,
    monitoring_companies: List[dict],
) -> Optional[dict]:
    text_value = article_text or ""

    for row in monitoring_companies:
        company_name = row.get("company_name") or ""
        corp_code = row.get("corp_code")
        normalized = normalize_company_name(company_name)

        if not normalized:
            continue

        if company_name in text_value or normalized in text_value:
            return {
                "company_name": company_name,
                "corp_code": corp_code,
            }

    return None


def create_news_signals(
    db: Session,
    tenant_id: int,
    candidates: List[dict],
) -> Dict[str, int]:
    inserted_count = 0
    skipped_count = 0
    matched_company_count = 0

    monitoring_companies = get_monitoring_target_companies(db, tenant_id)

    for c in candidates:
        article_id = c.get("id")
        title = c.get("title") or ""
        article_summary = c.get("summary") or ""
        content = c.get("content") or ""
        original_company_name = c.get("company_name")
        published_at = c.get("published_at")
        url = c.get("url")

        if not article_id:
            skipped_count += 1
            continue

        article_id_str = str(article_id)

        if signal_exists(db, tenant_id, "news", article_id_str):
            skipped_count += 1
            continue

        full_text = " ".join([title, article_summary, content])
        classified = classify_signal_with_llm(
            source="news",
            text=full_text,
        )

        if not classified:
            classified = classify_signal(full_text)

        if not classified:
            skipped_count += 1
            continue

        company_name = original_company_name
        corp_code = None

        if not company_name:
            matched = find_company_name_from_article(full_text, monitoring_companies)
            if matched:
                company_name = matched["company_name"]
                corp_code = matched["corp_code"]
                matched_company_count += 1
        
        if similar_signal_exists(
            db=db,
            tenant_id=tenant_id,
            source="news",
            company_name=company_name,
            signal_keyword=classified["signal_keyword"],
            detected_at=published_at,
        ):
            skipped_count += 1
            continue

        if not company_name:
            skipped_count += 1
            continue

        db.execute(
            text("""
                insert into public.signals (
                    tenant_id,
                    corp_code,
                    company_name,
                    source,
                    source_id,
                    source_url,
                    signal_keyword,
                    signal_category,
                    signal_level,
                    signal_type,
                    event_type,
                    title,
                    summary,
                    detected_at,
                    hit_score,
                    industry_label
                )
                values (
                    :tenant_id,
                    :corp_code,
                    :company_name,
                    :source,
                    :source_id,
                    :source_url,
                    :signal_keyword,
                    :signal_category,
                    :signal_level,
                    :signal_type,
                    :event_type,
                    :title,
                    :summary,
                    :detected_at,
                    :hit_score,
                    :industry_label
                )
            """),
            {
                "tenant_id": tenant_id,
                "corp_code": corp_code,
                "company_name": company_name,
                "source": "news",
                "source_id": article_id_str,
                "source_url": url,
                "signal_keyword": classified["signal_keyword"],
                "signal_category": classified["signal_category"],
                "signal_level": classified["signal_level"],
                "signal_type": classified["signal_type"],
                "event_type": classified["event_type"],
                "title": title,
                "summary": classified["summary"],
                "detected_at": published_at,
                "hit_score": 1,
                "industry_label": classified["industry_label"],
            },
        )

        inserted_count += 1

    db.commit()

    return {
        "inserted_count": inserted_count,
        "skipped_count": skipped_count,
        "matched_company_count": matched_company_count,
    }

def similar_signal_exists(
    db: Session,
    tenant_id: int,
    source: str,
    company_name: str,
    signal_keyword: str,
    detected_at,
) -> bool:
    row = db.execute(
        text("""
            select 1
            from public.signals
            where tenant_id = :tenant_id
              and source = :source
              and company_name = :company_name
              and signal_keyword = :signal_keyword
              and detected_at = :detected_at
            limit 1
        """),
        {
            "tenant_id": tenant_id,
            "source": source,
            "company_name": company_name,
            "signal_keyword": signal_keyword,
            "detected_at": detected_at,
        },
    ).first()

    return row is not None