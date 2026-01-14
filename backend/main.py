from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os

from backend.api import auth, analysis, reviews, stores

app = FastAPI(title="Emotion AI Backend")

ENV = os.getenv("ENV", "local")

# =========================
# Session (쿠키 기반 인증)
# =========================
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "dev-secret-key"),
    same_site="none" if ENV != "local" else "lax",
    https_only=False if ENV == "local" else True,
)

# =========================
# CORS 설정
# =========================
# 1️⃣ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://emotion-ai-jkax-wqsd.vercel.app",
    ],
    allow_credentials=True,   # 🔥 세션 쿠키 때문에 필수
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2️⃣ Session
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET"),
    max_age=60 * 60 * 24,   # 1 day
    same_site="lax",        # OAuth 필수
    https_only=True,        # Render (HTTPS)
)

# =========================
# Routers
# =========================
app.include_router(auth.router)
app.include_router(stores.router)
app.include_router(reviews.router)
app.include_router(analysis.router)

