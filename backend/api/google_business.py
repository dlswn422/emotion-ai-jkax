import os
import secrets
import requests
import pprint

from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials

from backend.db.session import get_db
from backend.db.models import OAuthAccount

router = APIRouter(tags=["google-business"])

CLIENT_SECRET_FILE = os.getenv("CLIENT_SECRET_FILE")
BACKEND_URL = os.getenv("BACKEND_URL")
FRONTEND_URL = os.getenv("FRONTEND_URL")

SCOPES = [
    "https://www.googleapis.com/auth/business.manage",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
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
        access_type="offline",
        prompt="consent",
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
    # 1️⃣ state 검증
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

    # 4️⃣ Credentials 재구성
    credentials = Credentials(
        token=flow.credentials.token,
        refresh_token=flow.credentials.refresh_token,
        token_uri=flow.credentials.token_uri,
        client_id=flow.credentials.client_id,
        client_secret=flow.credentials.client_secret,
        scopes=flow.credentials.scopes,
    )

    print("\n===== GOOGLE BUSINESS TOKEN DEBUG =====")
    print("Access Token:", credentials.token)
    print("Refresh Token:", credentials.refresh_token)
    print("Scopes:", credentials.scopes)
    print("=======================================\n")

    if not credentials.token:
        raise HTTPException(status_code=500, detail="Access token not issued")

    # 5️⃣ Google profile 조회 (requests 방식)
    profile_res = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={
            "Authorization": f"Bearer {credentials.token}"
        },
        timeout=5,
    )

    if profile_res.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch profile: {profile_res.text}",
        )

    profile = profile_res.json()

    print("\n===== GOOGLE PROFILE (BUSINESS) =====")
    pprint.pprint(profile)
    print("=====================================\n")

    # 6️⃣ OAuthAccount upsert
    oauth = OAuthAccount(
        user_id=user_id,
        provider="google",
        provider_account_id=profile["id"],
        refresh_token=credentials.refresh_token,
        scope=" ".join(SCOPES),
    )

    db.merge(oauth)
    db.commit()

    return RedirectResponse(f"{FRONTEND_URL}/stores")