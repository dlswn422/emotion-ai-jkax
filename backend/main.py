from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os

# API 라우터
from backend.api import auth, analysis, reviews, stores

app = FastAPI(title="Emotion AI Backend")

# =========================
# Session (쿠키 기반 인증)
# =========================
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "dev-secret-key"),
    same_site="none",      # ⭐ Vercel ↔ Render 필수
    https_only=True,       # ⭐ 배포 환경 필수
)

# =========================
# CORS 설정 (쿠키 허용)
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://emotion-ai-jkax-wqsd.vercel.app",
    ],
    allow_credentials=True,   # ⭐⭐⭐ 핵심
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# API Router 등록
# =========================
app.include_router(auth.router)       # 로그인 / 로그아웃 / 상태
app.include_router(stores.router)     # 매장 목록 / 매장 정보
app.include_router(reviews.router)    # Google 리뷰 원본 조회
app.include_router(analysis.router)   # 분석 / CX 대시보드