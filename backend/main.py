from pathlib import Path
from dotenv import load_dotenv

# =========================
# .env 로드 (backend/.env)
# =========================
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(env_path)

import os
import asyncio
from contextlib import asynccontextmanager, suppress

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend.core.socket_manager import sio
from backend.api.socket_events import redis_listener

from backend.api import (
    analysis,
    stores,
    google_business,
    dashboard,
    customers,
    tenant_news,
    tenant_disclosures,
    monitoring_targets,
    industry_targets,
)

from backend.api.batch import router as batch_router
from backend.api.devices import router as devices_router
from backend.api.disclosure_candidates import router as disclosure_candidates_router
from backend.api.disclosure_signals import router as disclosure_signals_router
from backend.api.dashboard_competitor_analysis import (
    router as dashboard_competitor_analysis_router,
)
from backend.api.dashboard_customer_trend import (
    router as dashboard_customer_trend_router,
)
from backend.api.news_signals import router as news_signals_router
from backend.api.notifications import router as notifications_router

ENV = os.getenv("ENV", "local")

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://cxnexus.ai",
    "https://www.cxnexus.ai",
    "https://emotion-ai-jkax-wqsd.vercel.app",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 시작 시 Redis 리스너 백그라운드 실행
    task = asyncio.create_task(redis_listener())
    try:
        yield
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task


app = FastAPI(
    title="CX Nexus Backend",
    lifespan=lifespan,
)

# =========================
# CORS 설정
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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
ROUTERS = [
    stores.router,
    analysis.router,
    dashboard.router,
    google_business.router,
    customers.router,
    tenant_news.router,
    tenant_disclosures.router,
    monitoring_targets.router,
    industry_targets.router,
    disclosure_candidates_router,
    disclosure_signals_router,
    dashboard_customer_trend_router,
    dashboard_competitor_analysis_router,
    news_signals_router,
    batch_router,
    notifications_router,
    devices_router,
]

for router in ROUTERS:
    app.include_router(router)

# =========================
# Socket.io 마운트
# =========================
socket_app = socketio.ASGIApp(sio, app)