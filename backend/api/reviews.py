from fastapi import APIRouter, HTTPException, Depends, Query
from backend.db.session import get_db
from sqlalchemy.orm import Session
from backend.collectors.business_profile_client import (
    fetch_all_google_reviews,
    extract_review_texts,
)
from backend.service.google_review_service import sync_google_reviews

router = APIRouter(
    prefix="/reviews",
    tags=["reviews"],
)


@router.get("/google")
def get_google_reviews():
    """
    Google Business Profile 리뷰 원본 조회
    """
    try:
        raw_reviews = fetch_all_google_reviews()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    reviews = extract_review_texts(raw_reviews)

    return {
        "total": len(reviews),
        "reviews": reviews,
    }


@router.post("/sync")
def sync_reviews(
    store_id: str = Query(..., description="Store ID"),
    db: Session = Depends(get_db),
):
    """
    매장별 Google 리뷰 수동 동기화 API

    - store_id 기준으로 Google 리뷰 조회
    - 이미 저장된 리뷰는 제외
    - 신규 리뷰만 DB 저장
    - 수동 버튼 / 배치 프로그램 공용
    """

    result = sync_google_reviews(store_id=store_id, db=db)

    return {
        "message": "Google reviews sync completed",
        **result,
    }