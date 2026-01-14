from fastapi import APIRouter, UploadFile, File

from backend.service.analysis_service import (
    analyze_sentiment_from_file,
    analyze_google_reviews,
    get_analysis_result,
)

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"],
)

@router.post("/file")
async def analyze(file: UploadFile = File(...)):
    return await analyze_sentiment_from_file(file)


@router.post("/google")
def analyze_google():
    return analyze_google_reviews()


@router.get("/{store_id}")
def fetch_analysis_result(store_id: str):
    return get_analysis_result(store_id)
