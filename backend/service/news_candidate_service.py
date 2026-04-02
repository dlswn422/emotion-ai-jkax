from __future__ import annotations

from typing import List
from sqlalchemy import text
from sqlalchemy.orm import Session


NEWS_SIGNAL_KEYWORDS = [
    "회수", "리콜", "허가취소", "행정처분", "GMP 위반", "부적합",
    "소송", "고발", "압수수색",
    "영업정지", "생산중단", "공급차질", "공장 화재",
    "논란", "부작용", "민원",
    "투자", "유상증자", "증설", "신규시설", "시설투자", "계약", "라이선스", "승인", "허가"
]


def get_news_candidates(
    db: Session,
    tenant_id: int,
    limit: int = 100,
) -> List[dict]:
    rows = db.execute(
        text("""
            select
                id,
                title,
                summary,
                content,
                url,
                source,
                keyword,
                company_name,
                published_at
            from public.articles
            where tenant_id = :tenant_id
            order by published_at desc nulls last, id desc
            limit :limit
        """),
        {
            "tenant_id": tenant_id,
            "limit": limit,
        },
    ).mappings().all()

    items = []

    for row in rows:
        full_text = " ".join([
            row.get("title") or "",
            row.get("summary") or "",
            row.get("content") or "",
        ])

        if any(kw in full_text for kw in NEWS_SIGNAL_KEYWORDS):
            items.append(dict(row))

    return items