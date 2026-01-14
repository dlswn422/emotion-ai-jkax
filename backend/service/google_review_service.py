from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List

from backend.collectors.business_profile_client import (
    fetch_all_google_reviews,
    extract_review_texts,
)

from backend.db.models import GoogleReview


# =========================================================
# 기존 함수 (LLM 분석용) — 그대로 유지
# =========================================================

def get_google_reviews_texts():
    """
    LLM 분석용 리뷰 텍스트 추출
    (기존 로직 그대로 유지)
    """
    raw_reviews = fetch_all_google_reviews()
    return extract_review_texts(raw_reviews)


# =========================================================
# 🔥 추가 함수 (DB 저장 + 배치/수동 공용)
# =========================================================

def sync_google_reviews(store_id: str, db: Session) -> Dict[str, Any]:
    """
    Google 리뷰 수집 및 DB 저장 서비스

    - store_id 기준으로 리뷰 수집
    - 이미 DB에 저장된 리뷰는 제외
    - 신규 리뷰만 INSERT
    - 수동 버튼 / 배치 프로그램 공용
    """

    # 1️⃣ 이미 저장된 Google 리뷰 ID 조회 (중복 방지 핵심)
    existing_review_ids = {
        r.google_review_id
        for r in db.query(GoogleReview.google_review_id)
            .filter(GoogleReview.store_id == store_id)
            .all()
    }

    # 2️⃣ Google API 호출 (기존 코드 재사용)
    raw_reviews: List[Dict] = fetch_all_google_reviews()

    new_reviews: List[GoogleReview] = []

    # 3️⃣ 신규 리뷰만 필터링
    for r in raw_reviews:
        review_id = r.get("reviewId")
        if not review_id:
            continue

        # 이미 저장된 리뷰면 스킵
        if review_id in existing_review_ids:
            continue

        new_reviews.append(
            GoogleReview(
                store_id=store_id,
                google_review_id=review_id,
                rating=_convert_rating(r.get("rating")),
                comment=r.get("comment"),
                created_at_google=_parse_datetime(r.get("createTime")),
                updated_at_google=_parse_datetime(r.get("updateTime")),
            )
        )

    # 4️⃣ DB 저장
    if new_reviews:
        db.bulk_save_objects(new_reviews)
        db.commit()

    return {
        "store_id": store_id,
        "total_fetched": len(raw_reviews),
        "inserted": len(new_reviews),
        "skipped": len(raw_reviews) - len(new_reviews),
    }


# =========================================================
# 내부 헬퍼 함수 (파일 내부에만 존재)
# =========================================================

def _parse_datetime(value: str | None):
    """
    Google API datetime 문자열 → datetime 객체
    """
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", ""))
    except Exception:
        return None


def _convert_rating(value):
    """
    Google 별점 포맷 대응 (필요 시 확장)
    """
    if isinstance(value, int):
        return value

    rating_map = {
        "ONE": 1,
        "TWO": 2,
        "THREE": 3,
        "FOUR": 4,
        "FIVE": 5,
    }

    return rating_map.get(value)