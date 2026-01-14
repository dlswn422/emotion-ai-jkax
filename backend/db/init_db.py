from backend.db.session import engine
from backend.db.base import Base

# ⚠️ 반드시 모델 import (이거 안 하면 테이블 안 생김)
from backend.db.models import Parse1Result, GoogleReview

def init_db():
    print("📦 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")

if __name__ == "__main__":
    init_db()
