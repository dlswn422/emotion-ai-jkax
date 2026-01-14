import json
from sqlalchemy.orm import Session
from fastapi import UploadFile

from backend.analysis.review_insight import analyze_review_insight
from backend.parser.file_parser import extract_reviews_from_file
from backend.db.models import Parse1Result
from backend.service.google_review_service import get_google_reviews_texts


async def analyze_review_insight_from_file(
    file: UploadFile,
    db: Session,
):
    reviews = await extract_reviews_from_file(file)
    result = analyze_review_insight(reviews)

    record = Parse1Result(
        total_reviews=len(reviews),
        raw_result=json.dumps(result, ensure_ascii=False),
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "result": result,
    }


def analyze_review_insight_from_google(
    db: Session,
):
    review_texts = get_google_reviews_texts()

    if not review_texts:
        return {"message": "리뷰가 없습니다."}

    result = analyze_review_insight(review_texts)

    record = Parse1Result(
        total_reviews=len(review_texts),
        raw_result=json.dumps(result, ensure_ascii=False),
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "source": "google_business_profile",
        "total_reviews": len(review_texts),
        "id": record.id,
        "result": result,
    }
