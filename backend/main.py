from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend.api import analysis, reviews, stores, integrations, google_business

app = FastAPI(title="Emotion AI Backend")

ENV = os.getenv("ENV", "local")

# =========================
# CORS 설정 (반드시 먼저)
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://emotion-ai-jkax-wqsd.vercel.app",
    ],
    allow_credentials=True,   # 🔥 세션 쿠키 필수
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Session (쿠키 기반 인증)
# =========================
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET"),   # 🔥 하나로 통일
    max_age=60 * 60 * 24,                     # 1 day
    same_site="lax" if ENV == "local" else "none",
    https_only=False if ENV == "local" else True,
)

# =========================
# Routers
# =========================
app.include_router(stores.router)
app.include_router(reviews.router)
app.include_router(analysis.router)

app.include_router(integrations.router)
app.include_router(google_business.router)