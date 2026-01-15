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

# 🔐 Google Business 연동용 Scope
SCOPES = [
    "https://www.googleapis.com/auth/business.manage",
]


@router.get("/connect/google-business")
def connect_google_business(request: Request):
    state = secrets.token_urlsafe(16)
    request.session["google_oauth_state"] = state

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=f"{BACKEND_URL}/connect/google-business/callback",
    )

    auth_url, _ = flow.authorization_url(
        access_type="offline",     # 🔥 refresh_token 발급 필수
        prompt="consent",          # 🔥 최초 1회 강제 동의
        include_granted_scopes="true",
        state=state,
    )

    return RedirectResponse(auth_url)


@router.get("/connect/google-business/callback")
def google_business_callback(
    request: Request,
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
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

    if not creds.refresh_token:
        raise HTTPException(
            status_code=500,
            detail="Refresh token not issued (already connected?)",
        )

    # 🔍 (선택) Google 계정 확인용 – 디버깅용
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

    print("\n===== GOOGLE BUSINESS CONNECTED =====")
    pprint.pprint(profile)
    print("====================================\n")

    # 4️⃣ OAuthAccount UPSERT (중복 시 업데이트)
    oauth = OAuthAccount(
        user_id=user_id,
        provider="google",
        provider_account_id=profile["id"],
        refresh_token=creds.refresh_token,
        scope=" ".join(creds.scopes),
    )

    db.merge(oauth)
    db.commit()

    # 5️⃣ 프론트 매장 화면으로 이동
    return RedirectResponse(f"{FRONTEND_URL}/stores")