from fastapi import UploadFile
from sqlalchemy.orm import Session
from datetime import datetime

from backend.parser.file_parser import extract_reviews_from_file
from backend.analysis.basic_sentiment import analyze_basic_sentiment
from backend.analysis.cx_dashboard import analyze_cx_dashboard

from backend.db.models import GoogleReview

async def analyze_file_sentiment(file: UploadFile):
    reviews = await extract_reviews_from_file(file)
    return analyze_basic_sentiment(reviews)


def analyze_store_cx_by_period(
    store_id: str,
    from_date: str,
    to_date: str,
    db: Session,
):
    """
    1️⃣ DB에서 리뷰 조회
    2️⃣ 텍스트만 추출
    3️⃣ LLM 분석
    """

    reviews = (
        db.query(GoogleReview)
        .filter(
            GoogleReview.place_id == store_id,
            GoogleReview.created_at_google >= _parse_date(from_date),
            GoogleReview.created_at_google <= _parse_date(to_date),
        )
        .order_by(GoogleReview.created_at_google.desc())
        .all()
    )

    review_texts = [
        r.text for r in reviews
        if r.text and len(r.text.strip()) > 3
    ]

    if not review_texts:
        return {
            "message": "분석할 리뷰가 없습니다.",
            "total": 0,
        }

    return analyze_cx_dashboard(review_texts)


def _parse_date(value: str):
    return datetime.fromisoformat(value)