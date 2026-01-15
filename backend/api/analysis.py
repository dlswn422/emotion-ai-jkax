from fastapi import APIRouter, UploadFile, File, Depends, Body
from sqlalchemy.orm import Session


from backend.db.session import get_db
from backend.service.analysis_service import analyze_store_cx_by_period, analyze_file_sentiment

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"],
)


@router.post("/file")
async def analyze_file(
    file: UploadFile = File(...)
):
    return await analyze_file_sentiment(file)


@router.post("/cx")
def analyze_cx_dashboard_api(
    store_id: str = Body(...),
    from_date: str = Body(...),
    to_date: str = Body(...),
    db: Session = Depends(get_db),
):
    """
    📊 CX 대시보드 분석
    - store_id
    - 기간(from ~ to)
    """
    return analyze_store_cx_by_period(
        store_id=store_id,
        from_date=from_date,
        to_date=to_date,
        db=db,
    )