from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from googleapiclient.discovery import build
import base64

from backend.service.google_review_service import sync_all_reviews_for_user
from backend.db.session import get_db
from backend.db.models import GoogleReview, User
from backend.collectors.business_profile_client import load_credentials
from backend.api.auth import get_current_user

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
    current_user: User = Depends(get_current_user),
):
    """
    로그인한 Google 계정에 연결된 모든 매장 목록 조회
    """

    # =========================
    # 🔍 DEBUG LOG
    # =========================
    print("\n===== [STORES] LIST STORES CALLED =====")
    print("SESSION USER_ID:", current_user.id)
    print("SESSION USER EMAIL:", current_user.email)
    print("======================================\n")

    # 🔑 user_id 기반 Credentials 로드
    creds = load_credentials(
        user_id=current_user.id,
        db=db,
    )

    print("✔ Credentials loaded successfully\n")

    # 1️⃣ Business Account 조회
    account_service = build(
        "mybusinessaccountmanagement",
        "v1",
        credentials=creds,
    )

    accounts = (
        account_service.accounts()
        .list()
        .execute()
        .get("accounts", [])
    )

    print("GOOGLE BUSINESS ACCOUNTS COUNT:", len(accounts))

    if not accounts:
        print("❌ NO GOOGLE BUSINESS ACCOUNTS FOUND\n")
        raise HTTPException(
            status_code=404,
            detail="연결된 Google Business 계정이 없습니다.",
        )

    # 2️⃣ Location 서비스
    location_service = build(
        "mybusinessbusinessinformation",
        "v1",
        credentials=creds,
    )

    results: list[dict] = []

    # 3️⃣ 모든 Business Account 순회
    for account in accounts:
        account_name = account["name"]  # accounts/{accountId}
        print("→ ACCOUNT:", account_name)

        locations = (
            location_service.accounts()
            .locations()
            .list(parent=account_name)
            .execute()
            .get("locations", [])
        )

        print("  LOCATIONS FOUND:", len(locations))

        for loc in locations:
            store_id = loc["name"]
            address = loc.get("storefrontAddress", {})
            categories = loc.get("categories", {})

            # 4️⃣ 우리 DB 기준 리뷰 집계
            agg = (
                db.query(
                    func.avg(GoogleReview.rating).label("avg_rating"),
                    func.count(GoogleReview.id).label("review_count"),
                )
                .filter(GoogleReview.store_id == store_id)
                .one()
            )

            avg_rating = (
                round(float(agg.avg_rating), 2)
                if agg.avg_rating is not None
                else None
            )

            review_count = agg.review_count or 0

            results.append({
                "store_key": encode_store_key(store_id),
                "store_id": store_id,
                "name": loc.get("title"),
                "address": " ".join(
                    filter(
                        None,
                        [
                            address.get("locality"),
                            address.get("administrativeArea"),
                        ],
                    )
                ),
                "category": (
                    categories
                    .get("primaryCategory", {})
                    .get("displayName")
                ),
                "status": loc.get("openInfo", {}).get("status", "UNKNOWN"),
                "rating": avg_rating,
                "review_count": review_count,
            })

    print("✅ FINAL STORE COUNT:", len(results))
    print("======================================\n")

    return results


# ----------------------------
# Store Detail API
# ----------------------------
@router.get("/{store_key}")
def get_store_detail(
    store_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print("\n===== [STORES] STORE DETAIL =====")
    print("SESSION USER_ID:", current_user.id)
    print("STORE_KEY:", store_key)
    print("================================\n")

    store_id = decode_store_key(store_key)

    creds = load_credentials(
        user_id=current_user.id,
        db=db,
    )

    service = build(
        "mybusinessbusinessinformation",
        "v1",
        credentials=creds,
    )

    try:
        location = (
            service.locations()
            .get(name=store_id)
            .execute()
        )
    except Exception:
        raise HTTPException(
            status_code=404,
            detail="매장 정보를 찾을 수 없습니다.",
        )

    address = location.get("storefrontAddress", {})
    categories = location.get("categories", {})

    address_text = " ".join(
        filter(
            None,
            [
                address.get("locality"),
                address.get("administrativeArea"),
            ],
        )
    )

    category_name = (
        categories
        .get("primaryCategory", {})
        .get("displayName")
    )

    status = location.get("openInfo", {}).get("status", "UNKNOWN")

    agg = (
        db.query(
            func.avg(GoogleReview.rating).label("avg_rating"),
            func.count(GoogleReview.id).label("review_count"),
            func.max(GoogleReview.created_at).label("last_review_at"),
        )
        .filter(GoogleReview.store_id == store_id)
        .one()
    )

    avg_rating = (
        round(float(agg.avg_rating), 2)
        if agg.avg_rating is not None
        else None
    )

    review_count = agg.review_count or 0

    last_synced_at = (
        agg.last_review_at.isoformat()
        if agg.last_review_at
        else None
    )

    description = None
    if category_name and address_text:
        description = (
            f"{address_text}에서 운영 중인 "
            f"{category_name} 매장입니다."
        )

    return {
        "store_id": store_id,
        "store_key": store_key,
        "name": location.get("title"),
        "address": address_text,
        "category": category_name,
        "status": status,
        "avg_rating": avg_rating,
        "review_count": review_count,
        "last_synced_at": last_synced_at,
        "description": description,
        "source": "google_business_profile",
    }


@router.post("/sync-reviews")
def sync_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print("\n===== [STORES] SYNC REVIEWS =====")
    print("SESSION USER_ID:", current_user.id)
    print("================================\n")

    result = sync_all_reviews_for_user(
        user_id=current_user.id,
        db=db,
    )

    return {
        "message": "리뷰 동기화 완료",
        **result,
    }