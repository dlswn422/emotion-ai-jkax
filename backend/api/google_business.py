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