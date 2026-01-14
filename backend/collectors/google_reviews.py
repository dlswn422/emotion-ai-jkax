from typing import List, Dict

def fetch_google_reviews(store_id: str) -> List[Dict]:
    """
    store_id → google_location_id 매핑 후
    Google Business Profile API에서 리뷰 전체 조회
    """

    # ⚠️ 실제 구현에서는
    # 네가 이미 만든 Google API 코드 여기에 연결
    return [
        {
            "reviewId": "google-review-1",
            "rating": 5,
            "comment": "정말 맛있어요",
            "createTime": "2025-12-01T09:30:00",
            "updateTime": "2025-12-01T09:30:00",
        },
        {
            "reviewId": "google-review-2",
            "rating": 4,
            "comment": "서비스가 좋아요",
            "createTime": "2025-12-05T12:10:00",
            "updateTime": "2025-12-05T12:10:00",
        },
    ]
