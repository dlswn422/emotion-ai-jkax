from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
from sqlalchemy.orm import Session
import secrets
import pprint
import requests
import os

from backend.db.session import get_db
from backend.db.models import User, Tenant

router = APIRouter(prefix="/auth", tags=["auth"])

# ===============================
# Environment
# ===============================
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
CLIENT_SECRET_FILE = os.getenv("CLIENT_SECRET_FILE")

# ===============================
# 🔐 LOGIN OAuth ONLY
# ===============================
LOGIN_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

REDIRECT_URI = f"{BACKEND_URL}/auth/google/callback"


# ===============================
# Google Login
# ===============================
@router.get("/google/login")
def google_login(request: Request):
    state = secrets.token_urlsafe(16)
    request.session["login_oauth_state"] = state

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=LOGIN_SCOPES,
        redirect_uri=REDIRECT_URI,
    )

    # 🔥 로그인에서는 offline / consent 절대 사용하지 않음
    auth_url, _ = flow.authorization_url(
        state=state,
        include_granted_scopes="true",
    )

    return RedirectResponse(auth_url)


# ===============================
# Google Login Callback
# ===============================
@router.get("/google/callback")
def google_callback(
    request: Request,
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    saved_state = request.session.get("login_oauth_state")
    if not saved_state or saved_state != state:
        return JSONResponse(
            {"error": "Invalid OAuth state"},
            status_code=400,
        )

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=LOGIN_SCOPES,
        redirect_uri=REDIRECT_URI,
    )
    flow.fetch_token(code=code)

    access_token = flow.credentials.token
    if not access_token:
        return JSONResponse(
            {"error": "Access token not issued"},
            status_code=500,
        )

    # 🔍 Google userinfo
    profile_res = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=5,
    )

    if profile_res.status_code != 200:
        return JSONResponse(
            {"error": "Failed to fetch Google profile"},
            status_code=500,
        )

    profile = profile_res.json()
    pprint.pprint(profile)

    google_account_id = profile["id"]
    email = profile["email"]

    user = (
        db.query(User)
        .filter(User.google_account_id == google_account_id)
        .first()
    )

    if not user:
        tenant = Tenant(name=email)
        db.add(tenant)
        db.flush()

        user = User(
            tenant_id=tenant.id,
            google_account_id=google_account_id,
            email=email,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        tenant = user.tenant

    # ✅ 세션 재설정 (정상 동작)
    request.session.clear()
    request.session["user_id"] = user.id
    request.session["tenant_id"] = tenant.id

    return RedirectResponse(FRONTEND_URL)


# ===============================
# Auth Status
# ===============================
@router.get("/status")
def auth_status(request: Request):
    return {
        "logged_in": bool(request.session.get("user_id")),
    }


# ===============================
# Logout
# ===============================
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
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]


# =========================================================
# 1️⃣ Google Business 연동 시작
# =========================================================
@router.get("/connect/google-business")
def connect_google_business(request: Request):
    print("\n===== START GOOGLE BUSINESS CONNECT =====")

    state = secrets.token_urlsafe(16)
    request.session["google_oauth_state"] = state

    print("Generated OAuth State:", state)
    print("CLIENT_SECRET_FILE:", CLIENT_SECRET_FILE)
    print("REDIRECT_URI:", f"{BACKEND_URL}/connect/google-business/callback")

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

    print("Redirecting to Google OAuth URL")
    print(auth_url)
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
    print("Received state:", state)
    print("Session state:", request.session.get("google_oauth_state"))

    # 1️⃣ CSRF 방어
    if request.session.get("google_oauth_state") != state:
        print("❌ INVALID OAUTH STATE")
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    # 2️⃣ 로그인 사용자 확인
    user_id = request.session.get("user_id")
    print("user_id from session:", user_id)

    if not user_id:
        print("❌ USER NOT AUTHENTICATED")
        raise HTTPException(status_code=401, detail="Not authenticated")

    # 3️⃣ 토큰 교환
    print("Exchanging code for token...")
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=f"{BACKEND_URL}/connect/google-business/callback",
    )
    flow.fetch_token(code=code)

    creds = flow.credentials

    print("\n----- TOKEN INFO -----")
    print("Access Token:", creds.token[:50] + "...")
    print("Refresh Token:", creds.refresh_token)
    print("Scopes:", creds.scopes)
    print("----------------------\n")

    if not creds.refresh_token:
        print("❌ REFRESH TOKEN NOT ISSUED")
        raise HTTPException(
            status_code=500,
            detail="Refresh token not issued (already connected?)",
        )

    # 🔍 Google 계정 확인 (디버깅)
    profile_res = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {creds.token}"},
        timeout=5,
    )

    print("Profile API status:", profile_res.status_code)

    if profile_res.status_code != 200:
        print("❌ FAILED TO FETCH PROFILE")
        print(profile_res.text)
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
        refresh_token=creds.refresh_token,
        scope=" ".join(creds.scopes),
    )

    print("Saving OAuthAccount to DB...")
    db.merge(oauth)
    db.commit()
    print("OAuthAccount saved successfully")

    # 5️⃣ 프론트 매장 화면으로 이동
    redirect_url = f"{FRONTEND_URL}/stores"
    print("Redirecting to:", redirect_url)
    print("=====================================\n")

    return RedirectResponse(redirect_url)


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
        print("❌ NOT AUTHENTICATED")
        raise HTTPException(status_code=401, detail="Not authenticated")

    # 2️⃣ 연동 여부 확인
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
        raise HTTPException(
            status_code=400,
            detail="Google Business not connected",
        )

    print("OAuthAccount found")
    print("provider_account_id:", oauth.provider_account_id)
    print("scope:", oauth.scope)

    # 3️⃣ access_token 재발급
    print("\nReissuing access token using refresh_token...")
    access_token = get_google_business_access_token(oauth.refresh_token)
    print("Access token issued:", access_token[:50] + "...")

    headers = {
        "Authorization": f"Bearer {access_token}",
    }

    # 4️⃣ Business 계정 목록 조회
    print("\n👉 CALLING ACCOUNTS API")
    accounts_res = requests.get(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        headers=headers,
        timeout=10,
    )

    print("Accounts API status:", accounts_res.status_code)

    if accounts_res.status_code != 200:
        print("❌ ACCOUNTS API ERROR")
        print(accounts_res.text)
        accounts_res.raise_for_status()

    accounts_data = accounts_res.json()
    pprint.pprint(accounts_data)

    accounts = accounts_data.get("accounts", [])
    if not accounts:
        print("❌ NO ACCOUNTS FOUND")
        return []

    account_name = accounts[0]["name"]
    print("Using account:", account_name)

    # 5️⃣ 매장(Location) 목록 조회
    print("\n👉 CALLING LOCATIONS API")
    locations_res = requests.get(
        f"https://mybusinessbusinessinformation.googleapis.com/v1/{account_name}/locations",
        headers=headers,
        timeout=10,
    )

    print("Locations API status:", locations_res.status_code)

    if locations_res.status_code != 200:
        print("❌ LOCATIONS API ERROR")
        print(locations_res.text)
        locations_res.raise_for_status()

    locations_data = locations_res.json()
    pprint.pprint(locations_data)

    locations = locations_data.get("locations", [])
    print(f"\n✅ TOTAL LOCATIONS: {len(locations)}")

    # 6️⃣ 데이터 변환
    result = []
    for loc in locations:
        result.append({
            "id": loc["name"],
            "name": loc.get("title"),
            "address": " ".join(
                loc.get("storefrontAddress", {}).get("addressLines", [])
            ),
            "rating": loc.get("averageRating"),
            "reviews": loc.get("totalReviewCount", 0),
        })

    print("\n===== GOOGLE BUSINESS LOCATIONS END =====\n")

    return result