from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from googleapiclient.discovery import build
import base64

from backend.service.google_review_service import sync_all_reviews_for_user
from backend.db.session import get_db
from backend.db.models import GoogleReview, User
from backend.collectors.business_profile_client import load_credentials
# from backend.api.auth import get_current_user
from backend.service.customer_service import get_store_customers_by_period

router = APIRouter(prefix="/stores", tags=["stores"])


# ----------------------------
# Store Key Encoder / Decoder
# ----------------------------
def encode_store_key(store_id: str) -> str:
    """
    accounts/.../locations/... → URL-safe key
    """
    return base64.urlsafe_b64encode(store_id.encode()).decode()


def decode_store_key(store_key: str) -> str:
    try:
        padded = store_key + "=" * (-len(store_key) % 4)
        return base64.urlsafe_b64decode(padded.encode()).decode()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid store key",
        )


# ----------------------------
# Store List API
# ----------------------------
@router.get("")
def list_stores(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user),
):
    """
    로그인한 Google 계정에 연결된 모든 매장 목록 조회
    """

    raise HTTPException(status_code=501, detail="Google Business 연동 준비 중입니다.")


# ----------------------------
# Store Detail API
# ----------------------------
@router.get("/{store_key}")
def get_store_detail(
    store_key: str,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user),
):
    raise HTTPException(status_code=501, detail="Google Business 연동 준비 중입니다.")


@router.post("/sync-reviews")
def sync_reviews(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user),
):
    raise HTTPException(status_code=501, detail="Google Business 연동 준비 중입니다.")


@router.get("/{store_id}/customers")
def get_store_customers(
    store_id: str,
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    return get_store_customers_by_period(
        db=db,
        store_id=store_id,
        from_date=from_date,
        to_date=to_date,
    )