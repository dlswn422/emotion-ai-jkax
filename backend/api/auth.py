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
# Enviroment Variable
# ===============================
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
CLIENT_SECRET_FILE=os.getenv("CLIENT_SECRET_FILE")

# ===============================
# Google OAuth Config (LOGIN)
# ===============================
SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

REDIRECT_URI = f"{BACKEND_URL}/auth/google/callback"


# ===============================
# Google OAuth Login
# ===============================
@router.get("/google/login")
def google_login(request: Request):
    state = secrets.token_urlsafe(16)
    request.session["oauth_state"] = state

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )

    auth_url, _ = flow.authorization_url(
        access_type="offline",      # 🔥 반드시 offline
        prompt="consent",           # 🔥 반드시 consent
        include_granted_scopes="true",
        state=state,
    )

    print("\n===== GOOGLE LOGIN =====")
    print("Auth URL:", auth_url)
    print("========================\n")

    return RedirectResponse(auth_url)


# ===============================
# Google OAuth Callback
# ===============================
@router.get("/google/callback")
def google_callback(
    request: Request,
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    print("\n===== GOOGLE CALLBACK HIT =====")
    print("code:", code)
    print("state:", state)
    print("===============================\n")

    # 1️⃣ CSRF state 검증
    saved_state = request.session.get("oauth_state")
    print("Saved session state:", saved_state)

    if not saved_state or state != saved_state:
        print("❌ STATE MISMATCH")
        return JSONResponse(
            {"error": "Invalid OAuth state"},
            status_code=400,
        )

    # 2️⃣ Token 교환
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )
    flow.fetch_token(code=code)

    # 🔥🔥🔥 핵심 디버그 프린트 🔥🔥🔥
    print("\n===== TOKEN DEBUG =====")
    print("Access Token:", flow.credentials.token)
    print("Refresh Token:", flow.credentials.refresh_token)
    print("Token URI:", flow.credentials.token_uri)
    print("Client ID:", flow.credentials.client_id)
    print("Scopes:", flow.credentials.scopes)
    print("========================\n")

    # 3️⃣ Google Profile 조회 (requests + Bearer)
    if not flow.credentials.token:
        print("❌ ACCESS TOKEN IS NONE")
        return JSONResponse(
            {"error": "Access token not issued"},
            status_code=500,
        )

    profile_res = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={
            "Authorization": f"Bearer {flow.credentials.token}"
        },
        timeout=5,
    )

    print("\n===== USERINFO RESPONSE =====")
    print("Status:", profile_res.status_code)
    print("Body:", profile_res.text)
    print("=============================\n")

    if profile_res.status_code != 200:
        return JSONResponse(
            {"error": "Failed to fetch userinfo"},
            status_code=500,
        )

    profile = profile_res.json()

    print("\n===== GOOGLE PROFILE =====")
    pprint.pprint(profile)
    print("==========================\n")

    # --- 여기 아래는 아직 중요 아님 (일단 안 봐도 됨) ---
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