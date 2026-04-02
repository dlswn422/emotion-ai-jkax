from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.collectors.dart_master_client import (
    download_corp_code_master,
    fetch_company_overview,
)

# tenant별 타겟 KSIC(초기 하드코딩)
TENANT_KSIC_MAP = {
    1: [
        "21210",
        "21220",
        "20423",
        # 필요 코드 추가
    ]
}

STATE_DIR = Path(__file__).resolve().parents[1] / "state"
STATE_DIR.mkdir(parents=True, exist_ok=True)
CURSOR_FILE = STATE_DIR / "sync_cursor.json"


def get_target_ksic_codes(tenant_id: int) -> List[str]:
    return TENANT_KSIC_MAP.get(tenant_id, [])


def load_cursor() -> int:
    if not CURSOR_FILE.exists():
        return 0

    try:
        data = json.loads(CURSOR_FILE.read_text(encoding="utf-8"))
        return int(data.get("dart_master_cursor", 0))
    except Exception:
        return 0


def save_cursor(cursor: int) -> None:
    payload = {
        "dart_master_cursor": cursor,
        "last_run_at": datetime.now(timezone.utc).isoformat(),
    }
    CURSOR_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def normalize_company_name(name: str | None) -> str | None:
    if not name:
        return None
    return (
        name.replace("(주)", "")
        .replace("주식회사", "")
        .replace("㈜", "")
        .strip()
        .lower()
    )


def industry_target_exists(db: Session, tenant_id: int, corp_code: str | None) -> bool:
    if not corp_code:
        return False

    sql = text("""
        select 1
        from public.industry_targets
        where tenant_id = :tenant_id
          and corp_code = :corp_code
        limit 1
    """)
    row = db.execute(sql, {"tenant_id": tenant_id, "corp_code": corp_code}).first()
    return row is not None


def insert_industry_target(
    db: Session,
    tenant_id: int,
    company_overview: Dict,
) -> None:
    now_utc = datetime.now(timezone.utc).isoformat()

    sql = text("""
        insert into public.industry_targets (
            tenant_id,
            company_name,
            corp_code,
            business_no,
            ksic_code,
            ksic_name,
            source_type,
            source_note,
            created_at,
            updated_at
        )
        values (
            :tenant_id,
            :company_name,
            :corp_code,
            :business_no,
            :ksic_code,
            :ksic_name,
            :source_type,
            :source_note,
            :created_at,
            :updated_at
        )
    """)

    db.execute(
        sql,
        {
            "tenant_id": tenant_id,
            "company_name": company_overview.get("corp_name"),
            "corp_code": company_overview.get("corp_code"),
            "business_no": company_overview.get("bizr_no"),
            "ksic_code": company_overview.get("induty_code"),
            "ksic_name": None,  # 현재 DART company API엔 업종명은 없음. 필요 시 별도 매핑
            "source_type": "KSIC",
            "source_note": "dart corpCode + company API match",
            "created_at": now_utc,
            "updated_at": now_utc,
        },
    )


def collect_industry_targets_from_dart_master(
    db: Session,
    tenant_id: int,
    chunk_size: int = 1200,
) -> Dict:
    ksic_codes = set(get_target_ksic_codes(tenant_id))
    if not ksic_codes:
        return {
            "tenant_id": tenant_id,
            "message": "No target KSIC codes configured",
            "candidate_count": 0,
            "checked_count": 0,
            "inserted_count": 0,
            "skipped_count": 0,
            "next_cursor": load_cursor(),
        }

    corp_list = download_corp_code_master()

    start = load_cursor()
    end = min(start + chunk_size, len(corp_list))
    batch = corp_list[start:end]

    checked_count = 0
    inserted_count = 0
    skipped_count = 0
    matched_count = 0

    for idx, corp in enumerate(batch, start=1):
        corp_code = corp.get("corp_code")
        if not corp_code:
            skipped_count += 1
            continue

        try:
            overview = fetch_company_overview(corp_code)
        except Exception:
            skipped_count += 1
            continue

        checked_count += 1

        induty_code = overview.get("induty_code")
        if not induty_code or induty_code not in ksic_codes:
            skipped_count += 1
            continue

        matched_count += 1

        if industry_target_exists(db, tenant_id, corp_code):
            skipped_count += 1
            continue

        insert_industry_target(db, tenant_id, overview)
        inserted_count += 1

        if inserted_count % 50 == 0:
            db.commit()

    db.commit()

    next_cursor = 0 if end >= len(corp_list) else end
    save_cursor(next_cursor)

    return {
        "tenant_id": tenant_id,
        "target_ksic_codes": list(ksic_codes),
        "master_total_count": len(corp_list),
        "cursor_start": start,
        "cursor_end": end,
        "checked_count": checked_count,
        "matched_count": matched_count,
        "inserted_count": inserted_count,
        "skipped_count": skipped_count,
        "next_cursor": next_cursor,
    }