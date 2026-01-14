import os
import pickle

from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow

from backend.settings import (
    FRONTEND_URL,
    BACKEND_URL,
    CLIENT_SECRET_FILE,
    TOKEN_FILE,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# ===============================
# Google OAuth Config
# ===============================
SCOPES = ["https://www.googleapis.com/auth/business.manage"]

REDIRECT_URI = f"{BACKEND_URL}/auth/google/callback"


@router.get("/google/login")
def google_login():
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )

    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
    )

    return RedirectResponse(auth_url)


@router.get("/google/callback")
def google_callback(code: str):
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )

    flow.fetch_token(code=code)

    with open(TOKEN_FILE, "wb") as f:
        pickle.dump(flow.credentials, f)

    # ✅ 로그인 성공 후 프론트로 이동 (환경별 자동 분기)
    return RedirectResponse(FRONTEND_URL)


@router.get("/status")
def auth_status():
    return {"logged_in": os.path.exists(TOKEN_FILE)}


@router.post("/logout")
def logout():
    if os.path.exists(TOKEN_FILE):
        os.remove(TOKEN_FILE)
    return {"logged_out": True}
