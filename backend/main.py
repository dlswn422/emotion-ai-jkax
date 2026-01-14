from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# API 라우터
from backend.api import auth, analysis, reviews, stores

app = FastAPI(title="Emotion AI Backend")

# =========================
# CORS 설정
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
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