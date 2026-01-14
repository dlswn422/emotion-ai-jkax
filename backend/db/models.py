from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, UniqueConstraint
from sqlalchemy.sql import func
from backend.db.base import Base  # ✅ 반드시 backend.db.base


# =========================
# 기존 모델 (유지)
# =========================

class Parse1Result(Base):
    __tablename__ = "parse1_results"

    id = Column(Integer, primary_key=True, index=True)
    total_reviews = Column(Integer, nullable=False)
    raw_result = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# =========================
# 🔥 추가 모델 (Google 리뷰)
# =========================

class GoogleReview(Base):
    __tablename__ = "google_reviews"

    id = Column(Integer, primary_key=True, index=True)

    store_id = Column(String, index=True, nullable=False)
    google_review_id = Column(String, nullable=False)

    rating = Column(Integer)
    comment = Column(Text)

    created_at_google = Column(DateTime)
    updated_at_google = Column(DateTime)

    fetched_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("google_review_id", name="uq_google_review_id"),
    )
