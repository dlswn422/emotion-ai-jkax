from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse, Response
from google_auth_oauthlib.flow import Flow
from sqlalchemy.orm import Session
import secrets
import requests
import os
import pprint

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
# 🔐 LOGIN ONLY SCOPES
# ===============================
LOGIN_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

REDIRECT_URI = f"{BACKEND_URL}/auth/google/callback"


# =========================================================
# 1️⃣ Google Login
# =========================================================
@router.get("/google/login")
def google_login(request: Request):
    state = secrets.token_urlsafe(16)
    request.session["login_oauth_state"] = state

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=LOGIN_SCOPES,
        redirect_uri=REDIRECT_URI,
    )

    auth_url, _ = flow.authorization_url(state=state)

    # PKCE verifier 저장
    request.session["login_oauth_code_verifier"] = flow.code_verifier

    print("\n===== GOOGLE LOGIN =====")
    print("Auth URL:", auth_url)
    print("State:", state)
    print("Code Verifier:", flow.code_verifier)
    print("========================\n")

    return RedirectResponse(auth_url)


# =========================================================
# 2️⃣ Google Login Callback
# =========================================================
@router.get("/google/callback")
def google_callback(
    request: Request,
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    print("\n===== GOOGLE LOGIN CALLBACK =====")
    print("code:", code)
    print("state:", state)

    saved_state = request.session.get("login_oauth_state")
    saved_code_verifier = request.session.get("login_oauth_code_verifier")

    print("saved_state:", saved_state)
    print("saved_code_verifier:", saved_code_verifier)

    if not saved_state or state != saved_state:
        return JSONResponse(
            {"error": "Invalid OAuth state"},
            status_code=400,
        )

    if not saved_code_verifier:
        return JSONResponse(
            {"error": "Missing OAuth code verifier"},
            status_code=400,
        )

    # state / verifier 는 1회용
    request.session.pop("login_oauth_state", None)
    request.session.pop("login_oauth_code_verifier", None)

    # ===============================
    # Token Exchange
    # ===============================
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRET_FILE,
        scopes=LOGIN_SCOPES,
        redirect_uri=REDIRECT_URI,
    )

    # PKCE verifier 복원
    flow.code_verifier = saved_code_verifier

    flow.fetch_token(code=code)
    credentials = flow.credentials

    print("\n===== TOKEN DEBUG (LOGIN) =====")
    print("Access Token:", credentials.token)
    print("Refresh Token:", credentials.refresh_token)
    print("Scopes:", credentials.scopes)
    print("===============================\n")

    if not credentials.token:
        return JSONResponse(
            {"error": "Access token missing"},
            status_code=500,
        )

    # ===============================
    # Fetch Google Profile
    # ===============================
    profile_res = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {credentials.token}"},
        timeout=5,
    )

    print("\n===== USERINFO RESPONSE =====")
    print("Status:", profile_res.status_code)
    print("Body:", profile_res.text)
    print("=============================\n")

    if profile_res.status_code != 200:
        return JSONResponse(
            {"error": "Failed to fetch user profile"},
            status_code=500,
        )

    profile = profile_res.json()

    print("\n===== GOOGLE PROFILE =====")
    pprint.pprint(profile)
    print("==========================\n")

    google_account_id = profile["id"]
    email = profile["email"]

    # ===============================
    # User / Tenant Upsert
    # ===============================
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

    # ===============================
    # Session Login
    # ===============================
    request.session.clear()
    request.session["user_id"] = user.id
    request.session["tenant_id"] = tenant.id

    return RedirectResponse(FRONTEND_URL)


# =========================================================
# 3️⃣ Auth Status
# =========================================================
@router.get("/status")
def auth_status(request: Request):
    return {
        "logged_in": bool(request.session.get("user_id")),
    }


# =========================================================
# 4️⃣ Logout
# =========================================================
@router.post("/logout")
def logout(request: Request, response: Response):
    request.session.clear()
    response.delete_cookie("session")
    return {"logged_out": True}


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    user_id = request.session.get("user_id")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="로그인이 필요합니다.",
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .one_or_none()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="유효하지 않은 사용자입니다.",
        )

    return user