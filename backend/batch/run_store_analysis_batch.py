from __future__ import annotations

import argparse
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)

from sqlalchemy.orm import Session

from backend.db.session import SessionLocal
from backend.db.models import GoogleReview
from backend.service.analysis_service import analyze_store_cx_by_period
from backend.service.cx_cache_service import (
    resolve_cx_status,
    save_cx_cache_result,
    make_error_response,
)
from backend.batch.batch_utils import resolve_window, utc_now, make_batch_run_id


DEFAULT_PERIODS = ["1D", "7D", "30D", "90D", "365D"]


def list_store_ids(db: Session) -> list[str]:
    rows = (
        db.query(GoogleReview.store_id)
        .filter(GoogleReview.store_id.isnot(None))
        .distinct()
        .all()
    )
    return sorted([row[0] for row in rows if row[0]])


def run_store_analysis_batch(
    *,
    store_ids: list[str] | None = None,
    period_types: list[str] | None = None,
) -> None:
    db = SessionLocal()
    batch_run_id = make_batch_run_id()
    batch_now = utc_now()

    period_types = period_types or DEFAULT_PERIODS
    target_store_ids = store_ids or list_store_ids(db)

    total_jobs = len(target_store_ids) * len(period_types)
    done = 0
    success = 0
    no_reviews = 0
    error = 0

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

                try:
                    response_json = analyze_store_cx_by_period(
                        store_id=store_id,
                        from_date=from_date,
                        to_date=to_date,
                        db=db,
                    )
                    status = resolve_cx_status(response_json)

                except Exception as e:
                    status = "ERROR"
                    response_json = make_error_response(str(e))

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
        f"success={success} no_reviews={no_reviews} error={error}"
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