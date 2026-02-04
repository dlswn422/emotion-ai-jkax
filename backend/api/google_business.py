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
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Google Business 연동용 Scope
SCOPES = [
    "https://www.googleapis.com/auth/business.manage",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

CALLBACK_PATH = "/connect/google-business/callback"


# =========================================================
# 1️⃣ Google Business 연동 시작
# =========================================================
@router.get("/connect/google-business")
def connect_google_business(request: Request):
    state = secrets.token_urlsafe(16)
    request.session["google_oauth_state"] = state

    redirect_uri = (
        str(request.base_url).rstrip("/") + CALLBACK_PATH
    )

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
        state=state,
    )

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
    # 1️⃣ CSRF 방어
    if request.session.get("google_oauth_state") != state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    # state 1회용
    request.session.pop("google_oauth_state", None)

    # 2️⃣ 로그인 사용자 확인
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # 3️⃣ 토큰 교환
    redirect_uri = (
        str(request.base_url).rstrip("/") + CALLBACK_PATH
    )

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )

    flow.fetch_token(code=code)
    creds = flow.credentials

    if not creds.refresh_token:
        raise HTTPException(
            status_code=500,
            detail="Refresh token not issued (already connected?)",
        )

    # 🔍 Google 계정 확인
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

    # 4️⃣ OAuthAccount UPSERT
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


# =========================================================
# 3️⃣ 연동 상태 확인
# =========================================================
@router.get("/connect/google-business/status")
def google_integration_status(
    request: Request,
    db: Session = Depends(get_db),
):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not logged in")

    account = (
        db.query(OAuthAccount)
        .filter_by(user_id=user_id, provider="google")
        .first()
    )

    return {"connected": bool(account)}
