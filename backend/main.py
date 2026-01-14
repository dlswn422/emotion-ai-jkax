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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://emotion-ai-jkax-wqsd.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Routers
# =========================
app.include_router(auth.router)
app.include_router(stores.router)
app.include_router(reviews.router)
app.include_router(analysis.router)
