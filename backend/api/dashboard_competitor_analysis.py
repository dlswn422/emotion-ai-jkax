from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.db.session import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/competitor-analysis")
def get_competitor_analysis_dashboard(
    tenant_id: int = Query(...),
    db: Session = Depends(get_db),
):
    # KPI
    kpi_row = db.execute(
        text("""
            select
                count(*) filter (where signal_type = 'RISK') as issue_hit_count,
                count(distinct source) as active_source_count,
                count(distinct signal_keyword) filter (where signal_type = 'RISK') as monitoring_keyword_count
            from public.signals
            where tenant_id = :tenant_id
        """),
        {"tenant_id": tenant_id},
    ).mappings().first()

    # 키워드 히트 현황
    keyword_hits = db.execute(
        text("""
            select
                signal_keyword as keyword,
                signal_category as category,
                signal_level as level,
                count(*) as hit_count,
                max(detected_at) as last_detected_at
            from public.signals
            where tenant_id = :tenant_id
              and signal_type = 'RISK'
            group by signal_keyword, signal_category, signal_level
            order by
                case signal_level
                    when 'HIGH' then 1
                    when 'MEDIUM' then 2
                    when 'LOW' then 3
                    else 4
                end,
                hit_count desc,
                last_detected_at desc nulls last
            limit 20
        """),
        {"tenant_id": tenant_id},
    ).mappings().all()

    # 경쟁사 상세 리스트
    competitor_details = db.execute(
        text("""
            select
                signal_keyword as keyword,
                company_name,
                source,
                source_url,
                summary,
                detected_at,
                signal_level,
                event_type
            from public.signals
            where tenant_id = :tenant_id
              and signal_type = 'RISK'
            order by
                case signal_level
                    when 'HIGH' then 1
                    when 'MEDIUM' then 2
                    when 'LOW' then 3
                    else 4
                end,
                detected_at desc nulls last,
                id desc
            limit 30
        """),
        {"tenant_id": tenant_id},
    ).mappings().all()

    return {
        "tenant_id": tenant_id,
        "kpis": {
            "issue_hit_count": int(kpi_row["issue_hit_count"] or 0),
            "active_source_count": int(kpi_row["active_source_count"] or 0),
            "monitoring_keyword_count": int(kpi_row["monitoring_keyword_count"] or 0),
        },
        "keyword_hits": [
            {
                "keyword": row["keyword"],
                "category": row["category"],
                "level": row["level"],
                "hit_count": int(row["hit_count"] or 0),
                "last_detected_at": row["last_detected_at"],
            }
            for row in keyword_hits
        ],
        "competitor_details": [
            {
                "keyword": row["keyword"],
                "company_name": row["company_name"],
                "source_label": "DART 공시" if row["source"] == "dart" else "뉴스",
                "source_url": row["source_url"],
                "summary": row["summary"],
                "detected_at": row["detected_at"],
                "signal_level": row["signal_level"],
                "event_type": row["event_type"],
            }
            for row in competitor_details
        ],
    }