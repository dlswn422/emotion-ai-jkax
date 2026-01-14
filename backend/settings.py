import os

# backend 폴더 기준
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

COLLECTORS_DIR = os.path.join(BASE_DIR, "collectors")

TOKEN_FILE = os.path.join(COLLECTORS_DIR, "token.pickle")
CLIENT_SECRET_FILE = os.path.join(COLLECTORS_DIR, "client_secret.json")

# ===============================
# Environment Flags
# ===============================
ENV = os.getenv("ENV", "local")  # local | production

# ===============================
# Frontend / Backend URLs
# ===============================
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000"
)

BACKEND_URL = os.getenv(
    "BACKEND_URL",
    "http://localhost:8000"
)

# ===============================
# CORS
# ===============================
CORS_ORIGINS = [
    FRONTEND_URL,
    "http://localhost:3000",
]

# ===============================
# Cookie / Auth
# ===============================
COOKIE_SECURE = ENV == "production"
COOKIE_SAMESITE = "none" if ENV == "production" else "lax"