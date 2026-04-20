from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional

from backend.service.b2b_cache_service import get_b2b_cache_current
from backend.db.session import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/customer-trend")
def get_customer_trend_dashboard(
    tenant_id: int = Query(...),
    # 프론트에서 ?from=2026-01-01 형태로 들어옴
    from_date: str | None = Query(None, alias="from"),
    # 프론트에서 ?to=2026-03-31 형태로 들어옴
    to_date: str | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    print("[customer-trend] tenant_id =", tenant_id)
    print("[customer-trend] from_date =", from_date)
    print("[customer-trend] to_date =", to_date)

    params = {
        "tenant_id": tenant_id,
        "from_date": from_date,
        "to_date": to_date,
    }

    # ------------------------------------------------------------
    # 1) 상단 KPI
    # ------------------------------------------------------------
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

    # ------------------------------------------------------------
    # 2) 순위표용 키워드 히트 현황
    #    - 사용자가 선택한 기간 기준
    # ------------------------------------------------------------
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

    # ------------------------------------------------------------
    # 3) 일별 추이용 데이터
    #    - 오늘 기준 최근 14일
    #    - 실제 감지된 키워드만 날짜별 count
    #    - 순위표 기준과 맞추기 위해 keyword/category/level 조합 유지
    # ------------------------------------------------------------
    daily_trend = db.execute(
        text("""
            select
                to_char(detected_at::date, 'YYYY-MM-DD') as bucket_date,
                signal_keyword as keyword,
                signal_category as category,
                signal_level as level,
                count(*) as hit_count
            from public.signals
            where tenant_id = :tenant_id
              and detected_at >= current_date - interval '13 day'
              and detected_at < current_date + interval '1 day'
            group by detected_at::date, signal_keyword, signal_category, signal_level
            order by bucket_date asc, keyword asc, category asc, level asc
        """),
        {"tenant_id": tenant_id},
    ).mappings().all()

    # ------------------------------------------------------------
    # 4) 월별 추이용 데이터
    #    - 오늘 기준 최근 6개월
    #    - HIGH / MEDIUM / LOW 총 건수 집계
    # ------------------------------------------------------------
    monthly_trend = db.execute(
        text("""
            select
                to_char(date_trunc('month', detected_at), 'YYYY-MM') as bucket_month,
                signal_level,
                count(*) as hit_count
            from public.signals
            where tenant_id = :tenant_id
              and detected_at >= date_trunc('month', current_date) - interval '5 month'
              and detected_at < date_trunc('month', current_date) + interval '1 month'
            group by date_trunc('month', detected_at), signal_level
            order by bucket_month asc
        """),
        {"tenant_id": tenant_id},
    ).mappings().all()

    # ------------------------------------------------------------
    # 5) 신규 영업기회 카드
    # ------------------------------------------------------------
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
        "daily_trend": [
            {
                "date": row["bucket_date"],
                "keyword": row["keyword"],
                "category": row["category"],
                "level": row["level"],
                "hit_count": int(row["hit_count"] or 0),
            }
            for row in daily_trend
        ],
        "monthly_trend": [
            {
                "month": row["bucket_month"],
                "signal_level": (row["signal_level"] or "MEDIUM").upper(),
                "hit_count": int(row["hit_count"] or 0),
            }
            for row in monthly_trend
        ],
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
@router.get("/customer-trend/cache")
def get_customer_trend_cache(
    tenant_id: int = Query(...),
    period_type: str = Query(..., description="1D | 7D | 30D | 90D | 365D"),
):
    cached = get_b2b_cache_current(
        tenant_id=tenant_id,
        analysis_type="CUSTOMER_TREND",
        period_type=period_type,
    )

    if not cached:
        raise HTTPException(status_code=404, detail="캐시 없음")

    return cached