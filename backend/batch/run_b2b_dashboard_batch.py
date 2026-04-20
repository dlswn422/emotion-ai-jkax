from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from backend.batch.batch_utils import make_batch_run_id, resolve_window, utc_now
from backend.db.session import SessionLocal
from backend.service.b2b_cache_service import (
    make_error_response,
    resolve_b2b_status,
    save_b2b_cache_result,
)

env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)

DEFAULT_PERIODS = ["1D", "7D", "30D", "90D", "365D"]


def parse_tenant_ids(raw: str) -> list[int]:
    values = [token.strip() for token in raw.split(",") if token.strip()]
    return [int(value) for value in values]


def resolve_target_tenant_ids(tenant_ids: list[int] | None = None) -> list[int]:
    if tenant_ids:
        return tenant_ids

    raw = os.getenv("B2B_BATCH_TENANT_IDS", "").strip()
    if not raw:
        raise RuntimeError("B2B_BATCH_TENANT_IDS 환경변수가 설정되지 않았습니다.")

    resolved = parse_tenant_ids(raw)
    if not resolved:
        raise RuntimeError("B2B_BATCH_TENANT_IDS 값이 비어 있습니다.")
    return resolved


def _level_lower(level: str) -> str:
    return (level or "medium").lower()


def fetch_signals(
    db,
    tenant_id: int,
    from_date: str | None = None,
    to_date: str | None = None,
) -> list[dict]:
    from sqlalchemy import text

    where_clauses = [
        "tenant_id = :tenant_id",
        "detected_at IS NOT NULL",
    ]
    params: dict[str, Any] = {"tenant_id": tenant_id}

    if from_date:
        where_clauses.append("detected_at >= CAST(:from_date AS DATE)")
        params["from_date"] = from_date

    if to_date:
        where_clauses.append("detected_at < (CAST(:to_date AS DATE) + INTERVAL '1 day')")
        params["to_date"] = to_date

    where_sql = " AND ".join(where_clauses)

    rows = db.execute(
        text(
            f"""
            SELECT
                id, corp_code, company_name, source,
                source_id, source_url, signal_keyword,
                signal_category, signal_level, signal_type,
                event_type, title, summary, detected_at, industry_label
            FROM public.signals
            WHERE {where_sql}
            ORDER BY detected_at DESC NULLS LAST
            """
        ),
        params,
    ).mappings().all()

    return [dict(row) for row in rows]


def build_customer_trend_json(
    db,
    tenant_id: int,
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict:
    signals = fetch_signals(db, tenant_id, from_date=from_date, to_date=to_date)
    opportunity_signals = [
        signal for signal in signals if (signal.get("signal_type") or "").upper() == "OPPORTUNITY"
    ]

    kw_map: dict[str, dict] = {}
    for signal in opportunity_signals:
        keyword = signal.get("signal_keyword") or ""
        if not keyword:
            continue

        if keyword not in kw_map:
            kw_map[keyword] = {
                "keyword": keyword,
                "signal_level": _level_lower(signal.get("signal_level", "medium")),
                "hit_count": 0,
                "last_hit": None,
                "source_name": signal.get("source") or "",
            }

        kw_map[keyword]["hit_count"] += 1
        detected_at = signal.get("detected_at")
        if detected_at:
            dt_str = detected_at.isoformat()[:10] if hasattr(detected_at, "isoformat") else str(detected_at)[:10]
            if kw_map[keyword]["last_hit"] is None or dt_str > kw_map[keyword]["last_hit"]:
                kw_map[keyword]["last_hit"] = dt_str

    signal_keywords = sorted(kw_map.values(), key=lambda item: -item["hit_count"])

    seen_companies: set[str] = set()
    prospects = []
    for signal in opportunity_signals:
        company = signal.get("company_name") or ""
        if not company or company in seen_companies:
            continue

        seen_companies.add(company)
        level = _level_lower(signal.get("signal_level", "medium"))
        detected_at = signal.get("detected_at")
        detected_str = (
            detected_at.isoformat()[:10]
            if detected_at and hasattr(detected_at, "isoformat")
            else str(detected_at or "")[:10]
        )

        prospects.append(
            {
                "prospect_name": company,
                "opportunity_grade": level,
                "signal": signal.get("summary") or signal.get("title") or "",
                "industry": signal.get("industry_label") or signal.get("signal_category") or "",
                "source": signal.get("source") or "",
                "detected_at": detected_str,
                "ref_url": signal.get("source_url") or "",
                "sales_status": "new",
            }
        )

    return {"signalKeywords": signal_keywords, "prospects": prospects}


def build_competitor_analysis_json(
    db,
    tenant_id: int,
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict:
    signals = fetch_signals(db, tenant_id, from_date=from_date, to_date=to_date)
    risk_signals = [signal for signal in signals if (signal.get("signal_type") or "").upper() == "RISK"]

    kw_map: dict[str, dict] = {}
    for signal in risk_signals:
        keyword = signal.get("signal_keyword") or ""
        company = signal.get("company_name") or ""
        map_key = f"{keyword}||{company}"
        if not keyword:
            continue

        if map_key not in kw_map:
            kw_map[map_key] = {
                "keyword": keyword,
                "signal_level": _level_lower(signal.get("signal_level", "medium")),
                "hit_count": 0,
                "last_hit": None,
                "competitor_name": company,
                "source_name": signal.get("source") or "",
                "opportunity": signal.get("summary") or "",
            }

        kw_map[map_key]["hit_count"] += 1
        detected_at = signal.get("detected_at")
        if detected_at:
            dt_str = detected_at.isoformat()[:10] if hasattr(detected_at, "isoformat") else str(detected_at)[:10]
            if kw_map[map_key]["last_hit"] is None or dt_str > kw_map[map_key]["last_hit"]:
                kw_map[map_key]["last_hit"] = dt_str

    issue_keywords = sorted(kw_map.values(), key=lambda item: -item["hit_count"])

    seen_urls: set[str] = set()
    issue_sources = []
    for signal in risk_signals:
        url = signal.get("source_url") or ""
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        issue_sources.append({"site_name": signal.get("source") or url, "url": url})

    return {"issueKeywords": issue_keywords, "issueSources": issue_sources}


def run_b2b_dashboard_batch(
    *,
    tenant_ids: list[int] | None = None,
    period_types: list[str] | None = None,
    include_customer_trend: bool = True,
    include_competitor_analysis: bool = True,
) -> None:
    batch_run_id = make_batch_run_id()
    batch_now = utc_now()

    target_tenant_ids = resolve_target_tenant_ids(tenant_ids)
    target_periods = period_types or DEFAULT_PERIODS

    total_jobs = len(target_tenant_ids) * len(target_periods) * (
        (1 if include_customer_trend else 0) + (1 if include_competitor_analysis else 0)
    )

    done = 0
    success = 0
    no_data = 0
    error = 0

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

                if include_customer_trend:
                    done += 1
                    print(f"[b2b-batch] ({done}/{total_jobs}) tenant={tenant_id} CUSTOMER_TREND {period_type}")
                    try:
                        response_json = build_customer_trend_json(
                            db=db,
                            tenant_id=tenant_id,
                            from_date=from_date,
                            to_date=to_date,
                        )
                        status = resolve_b2b_status(response_json, "CUSTOMER_TREND")
                    except Exception as exc:
                        status = "ERROR"
                        response_json = make_error_response(str(exc))

                    save_b2b_cache_result(
                        tenant_id=tenant_id,
                        analysis_type="CUSTOMER_TREND",
                        period_type=period_type,
                        window_start_at=window_start_at,
                        window_end_at=window_end_at,
                        generated_at=batch_now,
                        status=status,
                        response_json=response_json,
                        batch_run_id=batch_run_id,
                    )
                    success += int(status == "SUCCESS")
                    no_data += int(status == "NO_DATA")
                    error += int(status == "ERROR")
                    print(f"[b2b-batch] saved CUSTOMER_TREND {period_type} status={status}")

                if include_competitor_analysis:
                    done += 1
                    print(f"[b2b-batch] ({done}/{total_jobs}) tenant={tenant_id} COMPETITOR_ANALYSIS {period_type}")
                    try:
                        response_json = build_competitor_analysis_json(
                            db=db,
                            tenant_id=tenant_id,
                            from_date=from_date,
                            to_date=to_date,
                        )
                        status = resolve_b2b_status(response_json, "COMPETITOR_ANALYSIS")
                    except Exception as exc:
                        status = "ERROR"
                        response_json = make_error_response(str(exc))

                    save_b2b_cache_result(
                        tenant_id=tenant_id,
                        analysis_type="COMPETITOR_ANALYSIS",
                        period_type=period_type,
                        window_start_at=window_start_at,
                        window_end_at=window_end_at,
                        generated_at=batch_now,
                        status=status,
                        response_json=response_json,
                        batch_run_id=batch_run_id,
                    )
                    success += int(status == "SUCCESS")
                    no_data += int(status == "NO_DATA")
                    error += int(status == "ERROR")
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