from fastapi import UploadFile
from sqlalchemy.orm import Session
from datetime import datetime

from backend.parser.file_parser import extract_reviews_from_file
from backend.analysis.basic_sentiment import analyze_basic_sentiment
from backend.analysis.cx_dashboard import analyze_cx_dashboard

from backend.db.models import GoogleReview

from datetime import datetime, timedelta, timezone

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

    start_dt, end_dt = _parse_date_range(from_date, to_date)

    reviews = (
    db.query(GoogleReview)
    .filter(
        GoogleReview.store_id == store_id,
        GoogleReview.created_at_google >= start_dt,
        GoogleReview.created_at_google < end_dt,   # ✅ <= 말고 <
    )
    .order_by(GoogleReview.created_at_google.desc())
    .all()
)

    # ✅ 핵심 수정: text → review_text
    review_texts = [
        r.comment
        for r in reviews
        if r.comment and len(r.comment.strip()) > 3
    ]

    if not review_texts:
        return {
            "message": "분석할 리뷰가 없습니다.",
            "total": 0,
        }

    return analyze_cx_dashboard(review_texts)



def _parse_date_range(from_date: str, to_date: str):
    """
    프론트에서 받은 YYYY-MM-DD 기준
    [from 00:00:00, to 다음날 00:00:00) 범위 생성
    (timezone-aware)
    """
    start = datetime.fromisoformat(from_date).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
        tzinfo=timezone.utc,
    )

    end = (
        datetime.fromisoformat(to_date)
        .replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
            tzinfo=timezone.utc,
        )
        + timedelta(days=1)
    )

    return start, end