import os
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

DART_API_KEY = os.getenv("DART_API_KEY")
DART_PAGE_COUNT = int(os.getenv("DART_PAGE_COUNT", "20"))

DART_LIST_URL = "https://opendart.fss.or.kr/api/list.json"


def _to_yyyymmdd(value: date) -> str:
    return value.strftime("%Y%m%d")


def fetch_dart_disclosures(
    corp_code: str,
    bgn_de: Optional[str] = None,
    end_de: Optional[str] = None,
    page_count: int = DART_PAGE_COUNT,
) -> List[Dict[str, Any]]:
    if not DART_API_KEY:
        raise RuntimeError("DART_API_KEY not set")

    if not bgn_de:
        bgn_de = _to_yyyymmdd(date.today() - timedelta(days=7))
    if not end_de:
        end_de = _to_yyyymmdd(date.today())

    params = {
        "crtfc_key": DART_API_KEY,
        "corp_code": corp_code,
        "bgn_de": bgn_de,
        "end_de": end_de,
        "page_count": page_count,
        "page_no": 1,
    }

    resp = requests.get(DART_LIST_URL, params=params, timeout=20)
    resp.raise_for_status()

    payload = resp.json()

    status = payload.get("status")
    # 000 = 정상, 013 = 조회된 데이타가 없습니다.
    if status == "013":
        return []
    if status != "000":
        raise RuntimeError(f"DART API error: {payload.get('message')} (status={status})")

    return payload.get("list", [])