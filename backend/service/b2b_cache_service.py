from __future__ import annotations

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client


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


def resolve_b2b_status(response_json: dict[str, Any], analysis_type: str) -> str:
    if response_json.get("error") is True:
        return "ERROR"

    if analysis_type == "CUSTOMER_TREND":
        signal_keywords = response_json.get("signalKeywords", [])
        prospects = response_json.get("prospects", [])
        return "NO_DATA" if (not signal_keywords and not prospects) else "SUCCESS"

    if analysis_type == "COMPETITOR_ANALYSIS":
        issue_keywords = response_json.get("issueKeywords", [])
        issue_sources = response_json.get("issueSources", [])
        return "NO_DATA" if (not issue_keywords and not issue_sources) else "SUCCESS"

    return "ERROR"


def build_b2b_cache_payloads(
    *,
    tenant_id: int | str,
    analysis_type: str,
    period_type: str,
    window_start_at: datetime | None,
    window_end_at: datetime | None,
    generated_at: datetime,
    status: str,
    response_json: dict[str, Any],
    batch_run_id: str | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    payload_history = {
        "tenant_id": str(tenant_id),
        "analysis_type": analysis_type,
        "period_type": period_type,
        "window_start_at": window_start_at.isoformat() if window_start_at else None,
        "window_end_at": window_end_at.isoformat() if window_end_at else None,
        "generated_at": generated_at.isoformat(),
        "status": status,
        "response_json": response_json,
        "batch_run_id": batch_run_id or str(uuid.uuid4()),
    }

    payload_current = {
        "tenant_id": str(tenant_id),
        "analysis_type": analysis_type,
        "period_type": period_type,
        "window_start_at": window_start_at.isoformat() if window_start_at else None,
        "window_end_at": window_end_at.isoformat() if window_end_at else None,
        "generated_at": generated_at.isoformat(),
        "status": status,
        "response_json": response_json,
    }

    return payload_history, payload_current


def save_b2b_cache_result(
    *,
    tenant_id: int | str,
    analysis_type: str,
    period_type: str,
    window_start_at: datetime | None,
    window_end_at: datetime | None,
    generated_at: datetime,
    status: str,
    response_json: dict[str, Any],
    batch_run_id: str,
) -> None:
    supabase = get_supabase_client()

    payload_history, payload_current = build_b2b_cache_payloads(
        tenant_id=tenant_id,
        analysis_type=analysis_type,
        period_type=period_type,
        window_start_at=window_start_at,
        window_end_at=window_end_at,
        generated_at=generated_at,
        status=status,
        response_json=response_json,
        batch_run_id=batch_run_id,
    )

    supabase.table("b2b_dashboard_cache_history").insert(payload_history).execute()
    supabase.table("b2b_dashboard_cache_current").upsert(
        payload_current,
        on_conflict="tenant_id,analysis_type,period_type",
    ).execute()


def get_b2b_cache_current(
    tenant_id: int | str,
    analysis_type: str,
    period_type: str,
) -> dict[str, Any] | None:
    supabase = get_supabase_client()

    res = (
        supabase.table("b2b_dashboard_cache_current")
        .select("tenant_id, analysis_type, period_type, status, generated_at, response_json, updated_at")
        .eq("tenant_id", str(tenant_id))
        .eq("analysis_type", analysis_type)
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