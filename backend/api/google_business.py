import os
import secrets
import requests
import pprint

from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow

from backend.db.session import get_db
from backend.db.models import OAuthAccount
from backend.service.google_token import get_google_business_access_token

router = APIRouter(tags=["google-business"])

CLIENT_SECRET_FILE = os.getenv("CLIENT_SECRET_FILE")
BACKEND_URL = os.getenv("BACKEND_URL")
FRONTEND_URL = os.getenv("FRONTEND_URL")

# Google Business 연동용 Scope
SCOPES = [
    "https://www.googleapis.com/auth/business.manage",
]


# =========================================================
# 1️⃣ Google Business 연동 시작
# =========================================================
@router.get("/connect/google-business")
def connect_google_business(request: Request):
    print("\n===== START GOOGLE BUSINESS CONNECT =====")

    state = secrets.token_urlsafe(16)
    request.session["google_oauth_state"] = state

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=f"{BACKEND_URL}/connect/google-business/callback",
    )

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
        state=state,
    )

    print("Redirect URL:", auth_url)
    print("========================================\n")

    return RedirectResponse(auth_url)


# =========================================================
# 2️⃣ Google Business 연동 콜백
# =========================================================
@router.get("/connect/google-business/callback")
def google_business_callback(
    request: Request,
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    print("\n===== GOOGLE BUSINESS CALLBACK =====")

    # 1️⃣ CSRF 방어
    if request.session.get("google_oauth_state") != state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    # 2️⃣ 로그인 사용자 확인
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # 3️⃣ 토큰 교환
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=f"{BACKEND_URL}/connect/google-business/callback",
    )
    flow.fetch_token(code=code)

    creds = flow.credentials

    print("\n----- TOKEN INFO -----")
    print("Access Token:", creds.token[:40] + "...")
    print("Refresh Token:", creds.refresh_token)
    print("Scopes:", creds.scopes)
    print("----------------------\n")

    if creds.refresh_token:
        refresh_token = creds.refresh_token
        print("✅ New refresh_token issued")
    else:
        print("⚠️ refresh_token not issued, reuse existing")

        existing = (
            db.query(OAuthAccount)
            .filter(
                OAuthAccount.user_id == user_id,
                OAuthAccount.provider == "google",
            )
            .first()
        )

        if not existing or not existing.refresh_token:
            raise HTTPException(
                status_code=400,
                detail="Google Business not connected yet",
            )

        refresh_token = existing.refresh_token

    # 🔍 Google 계정 정보 확인
    profile_res = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {creds.token}"},
        timeout=5,
    )

    if profile_res.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch Google profile",
        )

    profile = profile_res.json()

    print("\n===== GOOGLE PROFILE =====")
    pprint.pprint(profile)
    print("==========================\n")

    # 4️⃣ OAuthAccount UPSERT
    oauth = OAuthAccount(
        user_id=user_id,
        provider="google",
        provider_account_id=profile["id"],
        refresh_token=refresh_token,  # ✅ 안전
        scope=" ".join(creds.scopes),
    )

    db.merge(oauth)
    db.commit()

    print("OAuthAccount saved")

    # 5️⃣ 프론트 매장 화면으로 이동
    return RedirectResponse(f"{FRONTEND_URL}/stores")


# =========================================================
# 3️⃣ Google Business 매장 목록 조회
# =========================================================
@router.get("/google-business/locations")
def get_google_business_locations(
    request: Request,
    db: Session = Depends(get_db),
):
    print("\n===== GOOGLE BUSINESS LOCATIONS START =====")

    # 1️⃣ 로그인 확인
    user_id = request.session.get("user_id")
    print("user_id:", user_id)

    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # 2️⃣ OAuth 연동 확인
    oauth = (
        db.query(OAuthAccount)
        .filter(
            OAuthAccount.user_id == user_id,
            OAuthAccount.provider == "google",
        )
        .first()
    )

    if not oauth or not oauth.refresh_token:
        print("❌ GOOGLE NOT CONNECTED")
        return {
            "connected": False,
            "accounts": 0,
            "locations": [],
        }

    print("OAuthAccount found")
    print("scope:", oauth.scope)

    # 3️⃣ Access Token 재발급
    access_token = get_google_business_access_token(oauth.refresh_token)
    headers = {"Authorization": f"Bearer {access_token}"}

    # 4️⃣ Accounts 조회
    print("\n👉 CALLING ACCOUNTS API")
    accounts_res = requests.get(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        headers=headers,
        timeout=10,
    )

    print("Accounts API status:", accounts_res.status_code)
    accounts_res.raise_for_status()

    accounts = accounts_res.json().get("accounts", [])
    print(f"✅ TOTAL ACCOUNTS: {len(accounts)}")

    if not accounts:
        return {
            "connected": True,
            "accounts": 0,
            "locations": [],
        }

    # 5️⃣ 모든 Account → 모든 Location 조회
    all_locations = []

    for idx, account in enumerate(accounts):
        account_name = account["name"]
        print(f"\n👉 [{idx+1}] CALLING LOCATIONS API:", account_name)

        locations_res = requests.get(
            f"https://mybusinessbusinessinformation.googleapis.com/v1/{account_name}/locations",
            headers=headers,
            timeout=10,
        )

        print("Locations API status:", locations_res.status_code)
        locations_res.raise_for_status()

        locations = locations_res.json().get("locations", [])
        print(f"   └─ Locations count: {len(locations)}")

        for loc in locations:
            all_locations.append({
                "store_id": loc["name"],                 # accounts/x/locations/y
                "account_id": account_name,              # 어떤 account 소속인지
                "name": loc.get("title"),
                "address": " ".join(
                    loc.get("storefrontAddress", {}).get("addressLines", [])
                ),
                "rating": loc.get("averageRating"),
                "reviews": loc.get("totalReviewCount", 0),
            })

    print("\n===== FINAL RESULT =====")
    print(f"TOTAL LOCATIONS: {len(all_locations)}")
    print("========================\n")

    return {
        "connected": True,
        "accounts": len(accounts),
        "locations": all_locations,
    }