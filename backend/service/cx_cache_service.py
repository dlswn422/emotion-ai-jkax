from __future__ import annotations

import os
import uuid
from pathlib import Path
from datetime import datetime
from typing import Any

from dotenv import load_dotenv
from supabase import create_client, Client


env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)


_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not supabase_url or not supabase_service_role_key:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 확인 필요")

    _supabase_client = create_client(supabase_url, supabase_service_role_key)
    return _supabase_client


def resolve_cx_status(response_json: dict[str, Any]) -> str:
    if response_json.get("error") is True:
        return "ERROR"

    if (
        response_json.get("review_count") == 0
        or response_json.get("message") == "분석할 리뷰가 없습니다."
    ):
        return "NO_REVIEWS"

    return "SUCCESS"


def build_cx_cache_payloads(
    *,
    store_id: str,
    period_type: str,
    window_start_at: datetime,
    window_end_at: datetime,
    generated_at: datetime,
    status: str,
    response_json: dict[str, Any],
    batch_run_id: str | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    payload_history = {
        "store_id": store_id,
        "period_type": period_type,
        "window_start_at": window_start_at.isoformat(),
        "window_end_at": window_end_at.isoformat(),
        "generated_at": generated_at.isoformat(),
        "status": status,
        "response_json": response_json,
        "batch_run_id": batch_run_id or str(uuid.uuid4()),
    }

    payload_current = {
        "store_id": store_id,
        "period_type": period_type,
        "window_start_at": window_start_at.isoformat(),
        "window_end_at": window_end_at.isoformat(),
        "generated_at": generated_at.isoformat(),
        "status": status,
        "response_json": response_json,
    }

    return payload_history, payload_current


def save_cx_cache_result(
    *,
    store_id: str,
    period_type: str,
    window_start_at: datetime,
    window_end_at: datetime,
    generated_at: datetime,
    status: str,
    response_json: dict[str, Any],
    batch_run_id: str,
) -> None:
    supabase = get_supabase_client()

    payload_history, payload_current = build_cx_cache_payloads(
        store_id=store_id,
        period_type=period_type,
        window_start_at=window_start_at,
        window_end_at=window_end_at,
        generated_at=generated_at,
        status=status,
        response_json=response_json,
        batch_run_id=batch_run_id,
    )

    supabase.table("cx_analysis_cache_history").insert(payload_history).execute()

    supabase.table("cx_analysis_cache_current").upsert(
        payload_current,
        on_conflict="store_id,period_type",
    ).execute()


def get_cx_cache_current(store_id: str, period_type: str) -> dict[str, Any] | None:
    supabase = get_supabase_client()

    res = (
        supabase.table("cx_analysis_cache_current")
        .select("store_id, period_type, status, generated_at, response_json, updated_at")
        .eq("store_id", store_id)
        .eq("period_type", period_type)
        .limit(1)
        .execute()
    )

    if not res.data:
        return None

    return res.data[0]


def make_error_response(message: str) -> dict[str, Any]:
    return {
        "error": True,
        "message": message,
    }