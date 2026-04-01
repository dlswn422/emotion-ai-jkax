from __future__ import annotations

import io
import os
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Optional

import requests
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

DART_API_KEY = os.getenv("DART_API_KEY")

# 공식 가이드 기준
DART_CORPCODE_URL = "https://opendart.fss.or.kr/api/corpCode.xml"
DART_COMPANY_URL = "https://opendart.fss.or.kr/api/company.json"


def download_corp_code_master() -> List[Dict[str, Optional[str]]]:
    """
    DART 기업코드 ZIP(XML) 다운로드 후 메모리에서 파싱.
    반환 예:
    [
        {
            "corp_code": "00126380",
            "corp_name": "삼성전자",
            "stock_code": "005930",
            "modify_date": "20260331"
        },
        ...
    ]
    """
    if not DART_API_KEY:
        raise RuntimeError("DART_API_KEY not set")

    resp = requests.get(
        DART_CORPCODE_URL,
        params={"crtfc_key": DART_API_KEY},
        timeout=60,
    )
    resp.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        xml_names = [name for name in zf.namelist() if name.lower().endswith(".xml")]
        if not xml_names:
            raise RuntimeError("corpCode ZIP did not contain XML file")

        xml_bytes = zf.read(xml_names[0])

    root = ET.fromstring(xml_bytes)

    results: List[Dict[str, Optional[str]]] = []
    for item in root.findall(".//list"):
        results.append(
            {
                "corp_code": _safe_text(item.find("corp_code")),
                "corp_name": _safe_text(item.find("corp_name")),
                "stock_code": _safe_text(item.find("stock_code")),
                "modify_date": _safe_text(item.find("modify_date")),
            }
        )

    return results


def fetch_company_overview(corp_code: str) -> Dict:
    """
    기업개황 조회.
    induty_code(업종코드), bizr_no(사업자번호) 등을 활용.
    """
    if not DART_API_KEY:
        raise RuntimeError("DART_API_KEY not set")

    resp = requests.get(
        DART_COMPANY_URL,
        params={
            "crtfc_key": DART_API_KEY,
            "corp_code": corp_code,
        },
        timeout=30,
    )
    resp.raise_for_status()

    data = resp.json()

    status = data.get("status")
    if status != "000":
        raise RuntimeError(
            f"DART company API error: status={status}, message={data.get('message')}, corp_code={corp_code}"
        )

    return data


def _safe_text(node: Optional[ET.Element]) -> Optional[str]:
    if node is None or node.text is None:
        return None
    value = node.text.strip()
    return value if value else None