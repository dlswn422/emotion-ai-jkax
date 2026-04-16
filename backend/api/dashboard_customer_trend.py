from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.db.session import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/customer-trend")
def get_customer_trend_dashboard(
    tenant_id: int = Query(...),
    # 시작일: 프론트에서 ?from=2026-01-01 형태로 들어옴
    from_date: str | None = Query(None, alias="from"),
    # 종료일: 프론트에서 ?to=2026-03-31 형태로 들어옴
    to_date: str | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    
    print("[customer-trend] tenant_id =", tenant_id)
    print("[customer-trend] from_date =", from_date)
    print("[customer-trend] to_date =", to_date)
    # 모든 SQL에서 공통으로 쓰는 파라미터
    params = {
        "tenant_id": tenant_id,
        "from_date": from_date,
        "to_date": to_date,
    }

    # KPI
    # - tenant_id 기준 조회
    # - detected_at이 기간 안에 들어오는 데이터만 집계
    kpi_row = db.execute(
        text("""
            select
                count(*) as signal_hit_count,
                count(*) filter (where signal_type = 'OPPORTUNITY') as new_opportunity_count,
                count(*) filter (
                    where signal_type = 'OPPORTUNITY'
                      and signal_level = 'HIGH'
                ) as high_opportunity_count
            from public.signals
            where tenant_id = :tenant_id
              and (:from_date is null or detected_at >= cast(:from_date as date))
              and (:to_date is null or detected_at < cast(:to_date as date) + interval '1 day')
        """),
        params,
    ).mappings().first()

    # 키워드 히트 현황
    # - 기간 안의 데이터만 group by
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
              and (:from_date is null or detected_at >= cast(:from_date as date))
              and (:to_date is null or detected_at < cast(:to_date as date) + interval '1 day')
            group by signal_keyword, signal_category, signal_level
            order by hit_count desc, last_detected_at desc nulls last
            limit 20
        """),
        params,
    ).mappings().all()

    # 기회 카드
    # - OPPORTUNITY 타입만 조회
    # - 기간 필터도 같이 적용
    opportunity_cards = db.execute(
        text("""
            select
                company_name,
                corp_code,
                industry_label,
                signal_keyword,
                source,
                source_url,
                detected_at,
                summary,
                signal_level,
                event_type
            from public.signals
            where tenant_id = :tenant_id
              and signal_type = 'OPPORTUNITY'
              and (:from_date is null or detected_at >= cast(:from_date as date))
              and (:to_date is null or detected_at < cast(:to_date as date) + interval '1 day')
            order by
                case signal_level
                    when 'HIGH' then 1
                    when 'MEDIUM' then 2
                    when 'LOW' then 3
                    else 4
                end,
                detected_at desc nulls last,
                id desc
            limit 20
        """),
        params,
    ).mappings().all()

    return {
        "tenant_id": tenant_id,
        "kpis": {
            "signal_hit_count": int(kpi_row["signal_hit_count"] or 0),
            "new_opportunity_count": int(kpi_row["new_opportunity_count"] or 0),
            "high_opportunity_count": int(kpi_row["high_opportunity_count"] or 0),
        },
        "keyword_hits": [dict(row) for row in keyword_hits],
        "opportunity_cards": [
            {
                "company_name": row["company_name"],
                "corp_code": row["corp_code"],
                "industry_label": row["industry_label"] or "-",
                "signal_keyword": row["signal_keyword"],
                "source_label": "DART 공시" if row["source"] == "dart" else "뉴스",
                "detected_at": row["detected_at"],
                "summary": row["summary"],
                "source_url": row["source_url"],
                "signal_level": row["signal_level"],
                "event_type": row["event_type"],
            }
            for row in opportunity_cards
        ],
    }