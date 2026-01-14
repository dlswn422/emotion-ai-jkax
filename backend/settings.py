import os

# ===============================
# Environment
# ===============================
ENV = os.getenv("ENV", "local")

# ===============================
# Base URLs
# ===============================
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# ===============================
# Google OAuth
# ===============================
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

# ===============================
# OAuth Files (로컬에서만 사용)
# ===============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COLLECTORS_DIR = os.path.join(BASE_DIR, "collectors")

CLIENT_SECRET_FILE = os.path.join(
    COLLECTORS_DIR,
    "client_secret.json"
)