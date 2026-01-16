from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from googleapiclient.discovery import build
import base64

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
    (여러 Business Account 지원)

    - Google Business Profile 실시간 조회
    - 우리 DB 기준 리뷰 집계 포함
    """

    # 🔑 user_id 기반 Credentials 로드
    creds = load_credentials(
        user_id=current_user.id,
        db=db,
    )

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

    if not accounts:
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

        locations = (
            location_service.accounts()
            .locations()
            .list(parent=account_name)
            .execute()
            .get("locations", [])
        )

        for loc in locations:
            store_id = loc["name"]  # accounts/.../locations/...
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
                # ✅ 프론트 라우팅용
                "store_key": encode_store_key(store_id),

                # 🔒 내부 식별자
                "store_id": store_id,

                # 🏪 매장 정보
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

                # 📊 리뷰 지표 (우리 DB 기준)
                "rating": avg_rating,
                "review_count": review_count,
            })

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
    """
    Google Business Profile 기준
    단일 매장 상세 정보 조회
    """

    # 1️⃣ store_key → store_id 복원
    store_id = decode_store_key(store_key)
    # 예: accounts/123456789/locations/987654321

    # 🔑 user_id 기반 Credentials 로드
    creds = load_credentials(
        user_id=current_user.id,
        db=db,
    )

    # 2️⃣ Location API 호출
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

    # 3️⃣ 주소 가공
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

    # 4️⃣ 프론트 응답
    return {
        "store_id": location["name"],
        "store_key": store_key,
        "name": location.get("title"),
        "address": address_text,
        "category": (
            categories
            .get("primaryCategory", {})
            .get("displayName")
        ),
        "status": location.get("openInfo", {}).get("status", "UNKNOWN"),
    }