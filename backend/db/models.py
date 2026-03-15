from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, BigInteger, Text, UniqueConstraint, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.db.base import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)

    users = relationship("User", back_populates="tenant")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)

    google_account_id = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant", back_populates="users")


class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)

    provider = Column(String, nullable=False)  # "google"
    provider_account_id = Column(String, nullable=False)

    refresh_token = Column(Text, nullable=False)
    scope = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class GoogleReview(Base):
    __tablename__ = "google_reviews_chang"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # 🔗 멀티테넌트 / 멀티매장 대응
    tenant_id = Column(BigInteger, ForeignKey("tenants.id"), nullable=False)
    store_id = Column(String, nullable=False)  
    # ex) accounts/123/locations/456

    # 🔑 Google 기준 유니크 ID (중복 방지 핵심)
    google_review_id = Column(String, nullable=False)

    # 👤 리뷰 메타데이터
    author_name = Column(String)
    rating = Column(Integer)
    comment = Column(Text)

    # 🕒 Google 원본 시간
    created_at_google = Column(DateTime(timezone=True))
    updated_at_google = Column(DateTime(timezone=True))

    # 🕒 시스템 기준 시간
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # 🔒 중복 방지 제약
    __table_args__ = (
        UniqueConstraint(
            "store_id",
            "google_review_id",
            name="uq_store_google_review",
        ),
    )