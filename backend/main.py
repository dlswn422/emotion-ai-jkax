from pathlib import Path
from dotenv import load_dotenv

# =========================
# .env 로드 (backend/.env)
# =========================
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(env_path)

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend.api.disclosure_candidates import router as disclosure_candidates_router
from backend.api.dashboard_customer_trend import router as dashboard_customer_trend_router
from backend.api.dashboard_competitor_analysis import router as dashboard_competitor_analysis_router
from backend.api.news_signals import router as news_signals_router

from backend.api import (
    analysis,
    auth,
    stores,
    google_business,
    dashboard,
    customers,
    tenant_news,
    tenant_disclosures,
    monitoring_targets,
    industry_targets,
)

# =========================
# FastAPI App
# =========================
app = FastAPI(title="CX Nexus Backend")

ENV = os.getenv("ENV", "local")

# =========================
# CORS 설정
# =========================
# ALLOWED_ORIGINS 환경변수: 쉼표로 구분된 URL 목록
# 예) ALLOWED_ORIGINS=https://cxnexus.ai,https://emotion-ai-jkax.vercel.app
_default_origins = "http://localhost:3000,https://cxnexus.ai,https://www.cxnexus.ai,https://emotion-ai-jkax-wqsd.vercel.app,https://emotion-ai-jkax-b2b-on-main.vercel.app"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://cxnexus.ai",
        "https://www.cxnexus.ai",
        "https://emotion-ai-jkax-wqsd.vercel.app",
        "https://emotion-ai-jkax-b2b-on-main.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Session (쿠키 기반 인증)
# =========================
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET"),
    max_age=60 * 60 * 24,
    same_site="lax" if ENV == "local" else "none",
    https_only=False if ENV == "local" else True,
)

# =========================
# Routers
# =========================
app.include_router(stores.router)
# app.include_router(auth.router)
app.include_router(analysis.router)
app.include_router(dashboard.router)
app.include_router(google_business.router)
app.include_router(tenant_news.router)
app.include_router(tenant_disclosures.router)
app.include_router(monitoring_targets.router)
app.include_router(industry_targets.router)
app.include_router(disclosure_candidates_router)
app.include_router(dashboard_customer_trend_router)
app.include_router(dashboard_competitor_analysis_router)
app.include_router(news_signals_router)
