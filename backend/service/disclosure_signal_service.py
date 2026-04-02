from __future__ import annotations

from typing import Dict, List

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.service.signal_classifier import classify_signal
from backend.service.llm_signal_classifier import classify_signal_with_llm


def signal_exists(
    db: Session,
    tenant_id: int,
    source: str,
    source_id: int,
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


def create_signals_from_candidates(
    db: Session,
    tenant_id: int,
    candidates: List[dict],
) -> Dict[str, int]:
    inserted_count = 0
    skipped_count = 0

    for c in candidates:
        disclosure_id = c.get("id")
        report_nm = c.get("report_nm") or ""
        corp_code = c.get("corp_code")
        corp_name = c.get("corp_name")
        rcept_dt = c.get("rcept_dt")
        link = c.get("link")

        if not disclosure_id:
            skipped_count += 1
            continue

        if signal_exists(db, tenant_id, "dart", str(disclosure_id)):
            skipped_count += 1
            continue

        classified = classify_signal_with_llm(
            source="dart",
            text=report_nm,
        )

        if not classified:
            classified = classify_signal(report_nm)

        if not classified:
            skipped_count += 1
            continue
        
        if similar_signal_exists(
            db=db,
            tenant_id=tenant_id,
            source="dart",
            company_name=corp_name,
            signal_keyword=classified["signal_keyword"],
            detected_at=rcept_dt,
        ):
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
                "company_name": corp_name,
                "source": "dart",
                "source_id": str(disclosure_id),
                "source_url": link,
                "signal_keyword": classified["signal_keyword"],
                "signal_category": classified["signal_category"],
                "signal_level": classified["signal_level"],
                "signal_type": classified["signal_type"],
                "event_type": classified["event_type"],
                "title": report_nm,
                "summary": classified["summary"],
                "detected_at": rcept_dt,
                "hit_score": 1,
                "industry_label": classified["industry_label"],
            },
        )

        inserted_count += 1

    db.commit()

    return {
        "inserted_count": inserted_count,
        "skipped_count": skipped_count,
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

    