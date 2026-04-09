from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone


VALID_PERIOD_TYPES = {"1D", "7D", "30D", "90D", "180D"}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def make_batch_run_id() -> str:
    return str(uuid.uuid4())


def resolve_window(period_type: str, now: datetime | None = None) -> tuple[datetime, datetime]:
    if period_type not in VALID_PERIOD_TYPES:
        raise ValueError(f"지원하지 않는 period_type: {period_type}")

    now = now or utc_now()

    days_map = {
        "1D": 1,
        "7D": 7,
        "30D": 30,
        "90D": 90,
        "180D": 180,
    }

    days = days_map[period_type]

    # 오늘 포함 rolling window
    window_end_at = now
    window_start_at = now - timedelta(days=days - 1)

    return window_start_at, window_end_at