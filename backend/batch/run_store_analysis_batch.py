from __future__ import annotations

from typing import Any
import argparse
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from backend.batch.batch_utils import make_batch_run_id, resolve_window, utc_now
from backend.db.models import GoogleReview
from backend.db.session import SessionLocal
from backend.service.analysis_service import analyze_store_cx_by_period
from backend.service.cx_cache_service import (
    make_error_response,
    resolve_cx_status,
    save_cx_cache_result,
)

env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)

DEFAULT_PERIODS = ["1D", "7D", "30D", "90D", "365D"]
MAX_ANALYZE_ATTEMPTS = 3
EXCLUDED_STORE_IDS = {"store_7", "store_9", "store_10"}


def _has_content(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, tuple, set, dict)):
        return len(value) > 0
    return True


def _is_minimal_cx_payload(payload: Any) -> bool:
    if not isinstance(payload, dict):
        return False
    return (
        "review_count" in payload
        and "rating" in payload
        and isinstance(payload.get("rating_distribution"), list)
    )


def _is_usable_cx_payload(payload: Any) -> bool:
    if not _is_minimal_cx_payload(payload):
        return False

    review_count = payload.get("review_count", 0)
    if review_count == 0:
        return True

    rich_fields = [
        payload.get("sentiment"),
        payload.get("nps"),
        payload.get("executive_summary"),
        payload.get("action_plan"),
        payload.get("drivers_of_satisfaction"),
        payload.get("areas_for_improvement"),
        payload.get("positive_keywords"),
        payload.get("negative_keywords"),
        payload.get("strategic_insights"),
    ]

    return any(_has_content(field) for field in rich_fields)


def list_store_ids(db: Session) -> list[str]:
    rows = (
        db.query(GoogleReview.store_id)
        .filter(GoogleReview.store_id.isnot(None))
        .distinct()
        .all()
    )
    return sorted([
        row[0]
        for row in rows
        if row[0] and row[0] not in EXCLUDED_STORE_IDS
    ])


def run_store_analysis_batch(
    *,
    store_ids: list[str] | None = None,
    period_types: list[str] | None = None,
) -> None:
    db = SessionLocal()
    batch_run_id = make_batch_run_id()
    batch_now = utc_now()

    period_types = period_types or DEFAULT_PERIODS

    if store_ids:
        target_store_ids = [store_id for store_id in store_ids if store_id not in EXCLUDED_STORE_IDS]
    else:
        target_store_ids = list_store_ids(db)

    if not target_store_ids:
        print("[store-batch] store_id가 없어 실행을 건너뜁니다.")
        db.close()
        return

    total_jobs = len(target_store_ids) * len(period_types)
    done = 0
    success = 0
    no_reviews = 0
    error = 0
    skipped_low_quality = 0

    print(f"[store-batch] batch_run_id={batch_run_id}")
    print(f"[store-batch] stores={len(target_store_ids)} periods={period_types} total_jobs={total_jobs}")

    try:
        for store_id in target_store_ids:
            for period_type in period_types:
                done += 1
                window_start_at, window_end_at = resolve_window(period_type, batch_now)

                from_date = window_start_at.date().isoformat()
                to_date = window_end_at.date().isoformat()

                print(
                    f"[store-batch] ({done}/{total_jobs}) "
                    f"store_id={store_id} period_type={period_type} "
                    f"from={from_date} to={to_date}"
                )

                response_json: dict[str, Any] | None = None
                status = "ERROR"

                for attempt in range(1, MAX_ANALYZE_ATTEMPTS + 1):
                    try:
                        candidate = analyze_store_cx_by_period(
                            store_id=store_id,
                            from_date=from_date,
                            to_date=to_date,
                            db=db,
                        )
                        candidate_status = resolve_cx_status(candidate)

                        if candidate_status == "NO_REVIEWS":
                            response_json = candidate
                            status = candidate_status
                            break

                        if candidate_status == "SUCCESS" and not _is_usable_cx_payload(candidate):
                            print(
                                f"[store-batch] low-quality payload "
                                f"store_id={store_id} period_type={period_type} "
                                f"attempt={attempt}/{MAX_ANALYZE_ATTEMPTS} -> retry"
                            )
                            response_json = candidate
                            status = candidate_status
                            if attempt < MAX_ANALYZE_ATTEMPTS:
                                continue
                            break

                        response_json = candidate
                        status = candidate_status
                        break

                    except Exception as exc:
                        print(
                            f"[store-batch] analyze error "
                            f"store_id={store_id} period_type={period_type} "
                            f"attempt={attempt}/{MAX_ANALYZE_ATTEMPTS}: {exc}"
                        )
                        if attempt == MAX_ANALYZE_ATTEMPTS:
                            response_json = make_error_response(str(exc))
                            status = "ERROR"

                if response_json is None:
                    response_json = make_error_response("분석 결과가 생성되지 않았습니다.")
                    status = "ERROR"

                if status == "SUCCESS" and not _is_usable_cx_payload(response_json):
                    skipped_low_quality += 1
                    print(
                        f"[store-batch] skip save low-quality payload "
                        f"store_id={store_id} period_type={period_type}"
                    )
                    continue

                save_cx_cache_result(
                    store_id=store_id,
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
                elif status == "NO_REVIEWS":
                    no_reviews += 1
                else:
                    error += 1

                print(
                    f"[store-batch] saved "
                    f"store_id={store_id} period_type={period_type} status={status}"
                )
    finally:
        db.close()

    print(
        f"[store-batch] done "
        f"success={success} no_reviews={no_reviews} "
        f"error={error} skipped_low_quality={skipped_low_quality}"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--store-id",
        action="append",
        dest="store_ids",
        help="특정 store_id만 배치 실행. 여러 번 지정 가능",
    )
    parser.add_argument(
        "--period",
        action="append",
        dest="period_types",
        help="특정 period_type만 실행. 예: --period 30D --period 90D",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_store_analysis_batch(
        store_ids=args.store_ids,
        period_types=args.period_types,
    )