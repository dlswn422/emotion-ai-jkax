from __future__ import annotations

import argparse
import uuid
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Any

from dotenv import load_dotenv

from backend.db.session import SessionLocal
from backend.service.b2b_cache_service import (
    save_b2b_cache_result,
    resolve_b2b_status,
    make_error_response,
)

env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)

DEFAULT_REAL_TENANT_IDS = "1"
DEFAULT_PERIODS = ["1D", "7D", "30D", "90D", "180D"]


# ──────────────────────────────────────────
# 유틸
# ──────────────────────────────────────────

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def make_batch_run_id() -> str:
    return str(uuid.uuid4())


def parse_tenant_ids(raw: str) -> list[int]:
    return [int(t.strip()) for t in raw.split(",") if t.strip()]


def resolve_window(period_type: str, now: datetime) -> tuple[datetime, datetime]:
    days_map = {"1D": 1, "7D": 7, "30D": 30, "90D": 90, "180D": 180}
    if period_type not in days_map:
        raise ValueError(f"지원하지 않는 period_type: {period_type}")
    days = days_map[period_type]
    return now - timedelta(days=days - 1), now


def _level_lower(level: str) -> str:
    return (level or "medium").lower()


# ──────────────────────────────────────────
# DB에서 signals 직접 읽기
# ──────────────────────────────────────────

def fetch_signals(
    db,
    tenant_id: int,
    from_date: str | None = None,
    to_date: str | None = None,
) -> list[dict]:
    from sqlalchemy import text

    where_clauses = ["tenant_id = :tenant_id"]
    params: dict[str, Any] = {"tenant_id": tenant_id}

    if from_date:
        where_clauses.append("(detected_at >= :from_date OR detected_at IS NULL)")
        params["from_date"] = from_date
    if to_date:
        where_clauses.append("(detected_at <= :to_date OR detected_at IS NULL)")
        params["to_date"] = to_date

    where_sql = " AND ".join(where_clauses)

    rows = db.execute(
        text(f"""
            SELECT
                id, corp_code, company_name, source,
                source_id, source_url, signal_keyword,
                signal_category, signal_level, signal_type,
                event_type, title, summary, detected_at, industry_label
            FROM public.signals
            WHERE {where_sql}
            ORDER BY detected_at DESC NULLS LAST
        """),
        params,
    ).mappings().all()

    return [dict(r) for r in rows]


# ──────────────────────────────────────────
# CUSTOMER_TREND JSON 생성 (기간별)
# ──────────────────────────────────────────

def build_customer_trend_json(
    db,
    tenant_id: int,
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict:
    signals = fetch_signals(db, tenant_id, from_date=from_date, to_date=to_date)
    opportunity_signals = [s for s in signals if (s.get("signal_type") or "").upper() == "OPPORTUNITY"]

    # signalKeywords: keyword 기준 집계
    kw_map: dict[str, dict] = {}
    for s in opportunity_signals:
        kw = s.get("signal_keyword") or ""
        if not kw:
            continue
        if kw not in kw_map:
            kw_map[kw] = {
                "keyword": kw,
                "signal_level": _level_lower(s.get("signal_level", "medium")),
                "hit_count": 0,
                "last_hit": None,
                "source_name": s.get("source") or "",
            }
        kw_map[kw]["hit_count"] += 1
        detected_at = s.get("detected_at")
        if detected_at:
            dt_str = detected_at.isoformat()[:10] if hasattr(detected_at, "isoformat") else str(detected_at)[:10]
            if kw_map[kw]["last_hit"] is None or dt_str > kw_map[kw]["last_hit"]:
                kw_map[kw]["last_hit"] = dt_str

    signal_keywords = sorted(kw_map.values(), key=lambda x: -x["hit_count"])

    # prospects: 기업별 영업기회 카드
    seen_companies: set[str] = set()
    prospects = []
    for s in opportunity_signals:
        company = s.get("company_name") or ""
        if not company or company in seen_companies:
            continue
        seen_companies.add(company)
        level = _level_lower(s.get("signal_level", "medium"))
        detected_at = s.get("detected_at")
        detected_str = detected_at.isoformat()[:10] if detected_at and hasattr(detected_at, "isoformat") else str(detected_at or "")[:10]
        prospects.append({
            "prospect_name": company,
            "opportunity_grade": level,
            "signal": s.get("summary") or s.get("title") or "",
            "industry": s.get("industry_label") or s.get("signal_category") or "",
            "source": s.get("source") or "",
            "detected_at": detected_str,
            "ref_url": s.get("source_url") or "",
            "sales_status": "new",
        })

    return {"signalKeywords": signal_keywords, "prospects": prospects}


# ──────────────────────────────────────────
# COMPETITOR_ANALYSIS JSON 생성 (기간별)
# ──────────────────────────────────────────

def build_competitor_analysis_json(
    db,
    tenant_id: int,
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict:
    signals = fetch_signals(db, tenant_id, from_date=from_date, to_date=to_date)
    risk_signals = [s for s in signals if (s.get("signal_type") or "").upper() == "RISK"]

    # issueKeywords: keyword + company 기준 집계
    kw_map: dict[str, dict] = {}
    for s in risk_signals:
        kw = s.get("signal_keyword") or ""
        company = s.get("company_name") or ""
        map_key = f"{kw}||{company}"
        if not kw:
            continue
        if map_key not in kw_map:
            kw_map[map_key] = {
                "keyword": kw,
                "signal_level": _level_lower(s.get("signal_level", "medium")),
                "hit_count": 0,
                "last_hit": None,
                "competitor_name": company,
                "source_name": s.get("source") or "",
                "opportunity": s.get("summary") or "",
            }
        kw_map[map_key]["hit_count"] += 1
        detected_at = s.get("detected_at")
        if detected_at:
            dt_str = detected_at.isoformat()[:10] if hasattr(detected_at, "isoformat") else str(detected_at)[:10]
            if kw_map[map_key]["last_hit"] is None or dt_str > kw_map[map_key]["last_hit"]:
                kw_map[map_key]["last_hit"] = dt_str

    issue_keywords = sorted(kw_map.values(), key=lambda x: -x["hit_count"])

    # issueSources: 유니크 출처
    seen_urls: set[str] = set()
    issue_sources = []
    for s in risk_signals:
        url = s.get("source_url") or ""
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        issue_sources.append({"site_name": s.get("source") or url, "url": url})

    return {"issueKeywords": issue_keywords, "issueSources": issue_sources}


# ──────────────────────────────────────────
# 배치 메인
# ──────────────────────────────────────────

def run_b2b_dashboard_batch(
    *,
    tenant_ids: list[int] | None = None,
    period_types: list[str] | None = None,
    include_customer_trend: bool = True,
    include_competitor_analysis: bool = True,
) -> None:
    batch_run_id = make_batch_run_id()
    batch_now = utc_now()

    target_tenant_ids = tenant_ids or parse_tenant_ids(DEFAULT_REAL_TENANT_IDS)
    target_periods = period_types or DEFAULT_PERIODS  # 7D/30D/90D/180D

    total_jobs = len(target_tenant_ids) * len(target_periods) * (
        (1 if include_customer_trend else 0) + (1 if include_competitor_analysis else 0)
    )

    done = success = no_data = error = 0

    print(f"[b2b-batch] batch_run_id={batch_run_id}")
    print(f"[b2b-batch] tenants={target_tenant_ids} periods={target_periods}")
    print(f"[b2b-batch] total_jobs={total_jobs}")

    db = SessionLocal()

    try:
        for tenant_id in target_tenant_ids:
            for period_type in target_periods:
                window_start_at, window_end_at = resolve_window(period_type, batch_now)
                from_date = window_start_at.date().isoformat()
                to_date = window_end_at.date().isoformat()

                # ── CUSTOMER_TREND (기간별) ──
                if include_customer_trend:
                    done += 1
                    print(f"[b2b-batch] ({done}/{total_jobs}) tenant={tenant_id} CUSTOMER_TREND {period_type}")
                    try:
                        response_json = build_customer_trend_json(
                            db=db, tenant_id=tenant_id,
                            from_date=from_date, to_date=to_date,
                        )
                        status = resolve_b2b_status(response_json, "CUSTOMER_TREND")
                    except Exception as e:
                        status = "ERROR"
                        response_json = make_error_response(str(e))

                    save_b2b_cache_result(
                        tenant_id=tenant_id, analysis_type="CUSTOMER_TREND",
                        period_type=period_type,
                        window_start_at=window_start_at, window_end_at=window_end_at,
                        generated_at=batch_now, status=status,
                        response_json=response_json, batch_run_id=batch_run_id,
                    )
                    success += status == "SUCCESS"
                    no_data += status == "NO_DATA"
                    error += status == "ERROR"
                    print(f"[b2b-batch] saved CUSTOMER_TREND {period_type} status={status}")

                # ── COMPETITOR_ANALYSIS (기간별) ──
                if include_competitor_analysis:
                    done += 1
                    print(f"[b2b-batch] ({done}/{total_jobs}) tenant={tenant_id} COMPETITOR_ANALYSIS {period_type}")
                    try:
                        response_json = build_competitor_analysis_json(
                            db=db, tenant_id=tenant_id,
                            from_date=from_date, to_date=to_date,
                        )
                        status = resolve_b2b_status(response_json, "COMPETITOR_ANALYSIS")
                    except Exception as e:
                        status = "ERROR"
                        response_json = make_error_response(str(e))

                    save_b2b_cache_result(
                        tenant_id=tenant_id, analysis_type="COMPETITOR_ANALYSIS",
                        period_type=period_type,
                        window_start_at=window_start_at, window_end_at=window_end_at,
                        generated_at=batch_now, status=status,
                        response_json=response_json, batch_run_id=batch_run_id,
                    )
                    success += status == "SUCCESS"
                    no_data += status == "NO_DATA"
                    error += status == "ERROR"
                    print(f"[b2b-batch] saved COMPETITOR_ANALYSIS {period_type} status={status}")

    finally:
        db.close()

    print(f"[b2b-batch] done success={success} no_data={no_data} error={error}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant-id", action="append", dest="tenant_ids", type=int)
    parser.add_argument("--period", action="append", dest="period_types")
    parser.add_argument("--skip-customer-trend", action="store_true")
    parser.add_argument("--skip-competitor-analysis", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_b2b_dashboard_batch(
        tenant_ids=args.tenant_ids,
        period_types=args.period_types,
        include_customer_trend=not args.skip_customer_trend,
        include_competitor_analysis=not args.skip_competitor_analysis,
    )