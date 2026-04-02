import html
import os
import re
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
NEWS_FETCH_SIZE = int(os.getenv("NEWS_FETCH_SIZE", "20"))

NAVER_NEWS_URL = "https://openapi.naver.com/v1/search/news.json"


def _strip_html_tags(text: Optional[str]) -> Optional[str]:
    if not text:
        return text
    cleaned = re.sub(r"<[^>]+>", "", text)
    return html.unescape(cleaned).strip()


def _parse_pub_date(pub_date: Optional[str]) -> Optional[str]:
    if not pub_date:
        return None
    try:
        return parsedate_to_datetime(pub_date).isoformat()
    except Exception:
        return None


def fetch_naver_news(keyword: str, display: int = NEWS_FETCH_SIZE) -> List[Dict[str, Any]]:
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        raise RuntimeError("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET not set")

    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    }

    params = {
        "query": keyword,
        "display": display,
        "sort": "date",
    }

    resp = requests.get(NAVER_NEWS_URL, headers=headers, params=params, timeout=20)
    resp.raise_for_status()

    payload = resp.json()
    items = payload.get("items", [])

    results: List[Dict[str, Any]] = []
    for item in items:
        title = _strip_html_tags(item.get("title"))
        description = _strip_html_tags(item.get("description"))
        url = item.get("originallink") or item.get("link")

        results.append(
            {
                "title": title,
                "content": description,
                "summary": description,
                "url": url,
                "source": "naver_news",
                "published_at": _parse_pub_date(item.get("pubDate")),
            }
        )

    return results