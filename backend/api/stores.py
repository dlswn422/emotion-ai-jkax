from fastapi import APIRouter, HTTPException
from googleapiclient.discovery import build

from backend.collectors.business_profile_client import load_credentials

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("")
def list_stores():
    """
    로그인한 Google Business 계정에 연결된 실제 매장 목록 조회
    """
    creds = load_credentials()

    # 1️⃣ Business Account 조회
    account_service = build(
        "mybusinessaccountmanagement",
        "v1",
        credentials=creds,
    )

    accounts = account_service.accounts().list().execute().get("accounts", [])
    if not accounts:
        raise HTTPException(
            status_code=404,
            detail="연결된 Google Business 계정이 없습니다.",
        )

    account_name = accounts[0]["name"]  # ex) accounts/123456789

    # 2️⃣ 매장(Location) 조회
    location_service = build(
        "mybusinessbusinessinformation",
        "v1",
        credentials=creds,
    )

    locations = (
        location_service.accounts()
        .locations()
        .list(parent=account_name)
        .execute()
        .get("locations", [])
    )

    results = []
    for loc in locations:
        address = loc.get("storefrontAddress", {})

        results.append({
            "store_id": loc["name"],  # accounts/{accountId}/locations/{locationId}
            "name": loc.get("title"),
            "address": " ".join(
                filter(None, [
                    address.get("locality"),
                    address.get("administrativeArea"),
                ])
            ),
            "category": loc.get("primaryCategory", {}).get("displayName"),
            "status": loc.get("openInfo", {}).get("status", "UNKNOWN"),
        })

    return results


@router.get("/{store_id}")
def store_detail(store_id: str):
    """
    특정 매장 상세 정보 조회
    (리뷰 제외, 메타 정보만)
    """
    creds = load_credentials()

    location_service = build(
        "mybusinessbusinessinformation",
        "v1",
        credentials=creds,
    )

    try:
        loc = (
            location_service.locations()
            .get(name=store_id)
            .execute()
        )
    except Exception:
        raise HTTPException(
            status_code=404,
            detail="해당 매장을 찾을 수 없습니다.",
        )

    address = loc.get("storefrontAddress", {})

    return {
        "store_id": loc["name"],
        "name": loc.get("title"),
        "address": " ".join(
            filter(None, [
                address.get("locality"),
                address.get("administrativeArea"),
            ])
        ),
        "category": loc.get("primaryCategory", {}).get("displayName"),
        "status": loc.get("openInfo", {}).get("status"),
        "phone": loc.get("phoneNumbers", {}).get("primaryPhone"),
        "website": loc.get("websiteUri"),
    }
