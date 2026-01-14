from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from sqlalchemy.orm import Session
import secrets
import pprint

from backend.settings import (
    FRONTEND_URL,
    BACKEND_URL,
    CLIENT_SECRET_FILE,
)
from backend.db.session import get_db
from backend.db.models import User, Tenant

router = APIRouter(prefix="/auth", tags=["auth"])

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
        access_type="online",
        state=state,
    )

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
    # 1️⃣ CSRF state 검증
    saved_state = request.session.get("oauth_state")
    if not saved_state or state != saved_state:
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

    # 3️⃣ Google 프로필 조회
    oauth2_service = build("oauth2", "v2", credentials=flow.credentials)
    profile = oauth2_service.userinfo().get().execute()

    print("\n================ GOOGLE PROFILE ================")
    pprint.pprint(profile)
    print("================================================\n")

    google_account_id = profile["id"]
    email = profile["email"]

    # 4️⃣ User 조회
    user = (
        db.query(User)
        .filter(User.google_account_id == google_account_id)
        .first()
    )

    # 5️⃣ 없으면 Tenant + User 자동 생성
    if not user:
        tenant = Tenant(name=email)
        db.add(tenant)
        db.flush()  # tenant.id 확보

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

    # 6️⃣ 🔥 세션 정리 (최종 형태)
    request.session.clear()
    request.session["user_id"] = user.id
    request.session["tenant_id"] = tenant.id

    return RedirectResponse(FRONTEND_URL)


# ===============================
# Auth Status (Login Guard)
# ===============================
@router.get("/status")
def auth_status(request: Request):
    return {
        "logged_in": bool(request.session.get("user_id")),
    }


# ===============================
# Logout
# ===============================
@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"logged_out": True}