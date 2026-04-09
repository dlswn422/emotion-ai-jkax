from __future__ import annotations

import os
import argparse
import uuid
from pathlib import Path
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv

from backend.service.b2b_cache_service import (
    save_b2b_cache_result,
    resolve_b2b_status,
    make_error_response,
)


env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)

BASE_URL = os.getenv("BATCH_BASE_URL", "http://127.0.0.1:8000").strip()
DEFAULT_REAL_TENANT_IDS = os.getenv("B2B_REAL_TENANT_IDS", "1").strip()

DEFAULT_COMPETITOR_PERIODS = ["30D"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def make_batch_run_id() -> str:
    return str(uuid.uuid4())


def parse_tenant_ids(raw: str) -> list[int]:
    result: list[int] = []
    for token in raw.split(","):
        token = token.strip()
        if not token:
            continue
        result.append(int(token))
    return result


def resolve_window(period_type: str, now: datetime) -> tuple[datetime, datetime]:
    days_map = {
        "1D": 1,
        "7D": 7,
        "30D": 30,
        "90D": 90,
        "180D": 180,
    }

    if period_type not in days_map:
        raise ValueError(f"지원하지 않는 competitor period_type: {period_type}")

    days = days_map[period_type]
    window_end_at = now
    window_start_at = now - timedelta(days=days - 1)
    return window_start_at, window_end_at


def fetch_customer_trend_final_json(tenant_id: int) -> dict:
    res = requests.get(
        f"{BASE_URL}/dashboard/customer-trend",
        params={"tenant_id": tenant_id},
        timeout=60,
    )

    if res.status_code != 200:
        try:
            error_json = res.json()
        except Exception:
            error_json = {"raw_text": res.text}
        raise RuntimeError(f"customer-trend failed: status={res.status_code}, body={error_json}")

    raw = res.json()

    return {
        "signalKeywords": raw.get("keyword_hits", []),
        "prospects": raw.get("opportunity_cards", []),
    }


def fetch_competitor_analysis_final_json(
    tenant_id: int,
    from_date: str,
    to_date: str,
) -> dict:
    res = requests.get(
        f"{BASE_URL}/dashboard/competitor-analysis",
        params={
            "tenant_id": tenant_id,
            "from": from_date,
            "to": to_date,
        },
        timeout=60,
    )

    if res.status_code != 200:
        try:
            error_json = res.json()
        except Exception:
            error_json = {"raw_text": res.text}
        raise RuntimeError(f"competitor-analysis failed: status={res.status_code}, body={error_json}")

    raw = res.json()

    return {
        "issueKeywords": raw.get("keyword_hits", []),
        "issueSources": raw.get("competitor_details", []),
    }


def run_b2b_dashboard_batch(
    *,
    tenant_ids: list[int] | None = None,
    competitor_period_types: list[str] | None = None,
    include_customer_trend: bool = True,
    include_competitor_analysis: bool = True,
) -> None:
    batch_run_id = make_batch_run_id()
    batch_now = utc_now()

    target_tenant_ids = tenant_ids or parse_tenant_ids(DEFAULT_REAL_TENANT_IDS)
    competitor_period_types = competitor_period_types or DEFAULT_COMPETITOR_PERIODS

    total_jobs = 0
    if include_customer_trend:
        total_jobs += len(target_tenant_ids)
    if include_competitor_analysis:
        total_jobs += len(target_tenant_ids) * len(competitor_period_types)

    done = 0
    success = 0
    no_data = 0
    error = 0

    print(f"[b2b-batch] batch_run_id={batch_run_id}")
    print(f"[b2b-batch] tenants={target_tenant_ids}")
    print(f"[b2b-batch] include_customer_trend={include_customer_trend}")
    print(f"[b2b-batch] include_competitor_analysis={include_competitor_analysis}")
    print(f"[b2b-batch] competitor_periods={competitor_period_types}")
    print(f"[b2b-batch] total_jobs={total_jobs}")

    for tenant_id in target_tenant_ids:
        # --------------------------------------------------
        # 1) CUSTOMER_TREND / ALL
        # --------------------------------------------------
        if include_customer_trend:
            done += 1
            print(f"[b2b-batch] ({done}/{total_jobs}) tenant_id={tenant_id} analysis_type=CUSTOMER_TREND period_type=ALL")

            try:
                response_json = fetch_customer_trend_final_json(tenant_id=tenant_id)
                status = resolve_b2b_status(response_json, "CUSTOMER_TREND")
            except Exception as e:
                status = "ERROR"
                response_json = make_error_response(str(e))

            save_b2b_cache_result(
                tenant_id=tenant_id,
                analysis_type="CUSTOMER_TREND",
                period_type="ALL",
                window_start_at=None,
                window_end_at=None,
                generated_at=batch_now,
                status=status,
                response_json=response_json,
                batch_run_id=batch_run_id,
            )

            if status == "SUCCESS":
                success += 1
            elif status == "NO_DATA":
                no_data += 1
            else:
                error += 1

            print(f"[b2b-batch] saved tenant_id={tenant_id} analysis_type=CUSTOMER_TREND period_type=ALL status={status}")

        # --------------------------------------------------
        # 2) COMPETITOR_ANALYSIS / period types
        # --------------------------------------------------
        if include_competitor_analysis:
            for period_type in competitor_period_types:
                done += 1
                window_start_at, window_end_at = resolve_window(period_type, batch_now)
                from_date = window_start_at.date().isoformat()
                to_date = window_end_at.date().isoformat()

                print(
                    f"[b2b-batch] ({done}/{total_jobs}) "
                    f"tenant_id={tenant_id} analysis_type=COMPETITOR_ANALYSIS "
                    f"period_type={period_type} from={from_date} to={to_date}"
                )

                try:
                    response_json = fetch_competitor_analysis_final_json(
                        tenant_id=tenant_id,
                        from_date=from_date,
                        to_date=to_date,
                    )
                    status = resolve_b2b_status(response_json, "COMPETITOR_ANALYSIS")
                except Exception as e:
                    status = "ERROR"
                    response_json = make_error_response(str(e))

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

                if status == "SUCCESS":
                    success += 1
                elif status == "NO_DATA":
                    no_data += 1
                else:
                    error += 1

                print(
                    f"[b2b-batch] saved "
                    f"tenant_id={tenant_id} analysis_type=COMPETITOR_ANALYSIS "
                    f"period_type={period_type} status={status}"
                )

    print(
        f"[b2b-batch] done "
        f"success={success} no_data={no_data} error={error}"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--tenant-id",
        action="append",
        dest="tenant_ids",
        type=int,
        help="특정 tenant_id만 실행. 여러 번 지정 가능",
    )
    parser.add_argument(
        "--competitor-period",
        action="append",
        dest="competitor_period_types",
        help="경쟁사 분석 period_type 지정. 예: --competitor-period 30D --competitor-period 90D",
    )
    parser.add_argument(
        "--skip-customer-trend",
        action="store_true",
        help="고객동향 분석 배치 생략",
    )
    parser.add_argument(
        "--skip-competitor-analysis",
        action="store_true",
        help="경쟁사 분석 배치 생략",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_b2b_dashboard_batch(
        tenant_ids=args.tenant_ids,
        competitor_period_types=args.competitor_period_types,
        include_customer_trend=not args.skip_customer_trend,
        include_competitor_analysis=not args.skip_competitor_analysis,
    )