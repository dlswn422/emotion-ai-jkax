from backend.analysis.sentiment import analyze_reviews
from backend.parser.file_parser import extract_reviews_from_file
from fastapi import UploadFile

async def analyze_sentiment_from_file(file: UploadFile):
    reviews = await extract_reviews_from_file(file)
    return analyze_reviews(reviews)

def analyze_google_reviews():
    # Google 리뷰 수집 → 분석 (추후 구현)
    return {
        "status": "processing"
    }


def get_analysis_result(store_id: str):
    # DB or mock 데이터 반환
    return {
        "store_id": store_id,
        "rating": 4.92,
        "nps": 9.54,
        "sentiment": {
            "positive": 92.3,
            "neutral": 5.4,
            "negative": 2.3,
        },
        "keywords": [
            "친절한 서비스",
            "음식 맛",
            "가성비",
        ],
        "executive_summary": "전반적인 고객 만족도가 매우 높습니다.",
        "strategic_insights": [
            "재방문 가능성이 매우 높음",
            "메뉴 품질이 핵심 경쟁력",
        ],
    }