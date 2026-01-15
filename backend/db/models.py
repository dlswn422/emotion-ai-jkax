from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, BigInteger, Text
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

class GoogleReview(Base):
    __tablename__ = "google_reviews"

    id = Column(BigInteger, primary_key=True)
    place_id = Column(String, nullable=False)
    author_name = Column(String)
    rating = Column(Integer)
    text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


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