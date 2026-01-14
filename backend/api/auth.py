from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
import secrets

from backend.settings import (
    FRONTEND_URL,
    BACKEND_URL,
    CLIENT_SECRET_FILE,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# ===============================
# Google OAuth Config
# ===============================
SCOPES = ["https://www.googleapis.com/auth/business.manage"]
REDIRECT_URI = f"{BACKEND_URL}/auth/google/callback"


# ===============================
# Google OAuth Login
# ===============================
@router.get("/google/login")
def google_login(request: Request):
    # ✅ CSRF 방지용 state 생성
    state = secrets.token_urlsafe(16)
    request.session["oauth_state"] = state

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=state,
    )

    return RedirectResponse(auth_url)


# ===============================
# Google OAuth Callback
# ===============================
@router.get("/google/callback")
def google_callback(request: Request, code: str, state: str):
    # ✅ state 검증
    saved_state = request.session.get("oauth_state")
    if not saved_state or state != saved_state:
        return JSONResponse(
            {"error": "Invalid OAuth state"},
            status_code=400,
        )

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )

    flow.fetch_token(code=code)

    # ✅ pickle ❌ → 세션에 로그인 상태 저장
    request.session["logged_in"] = True
    request.session["google_credentials"] = {
        "token": flow.credentials.token,
        "refresh_token": flow.credentials.refresh_token,
        "scopes": flow.credentials.scopes,
    }

    # 프론트엔드로 이동
    return RedirectResponse(FRONTEND_URL)


# ===============================
# Auth Status
# ===============================
@router.get("/status")
def auth_status(request: Request):
    return {
        "logged_in": bool(request.session.get("logged_in"))
    }


# ===============================
# Logout
# ===============================
@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"logged_out": True}