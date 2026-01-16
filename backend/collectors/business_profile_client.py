from typing import List, Dict
import os

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from sqlalchemy.orm import Session

from backend.db.models import OAuthAccount


# -------------------------------------------------
# Environment variables
# -------------------------------------------------
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

def load_credentials(
    *,
    user_id: int,
    db: Session,
) -> Credentials:
    """
    OAuthAccount 테이블 기반으로
    Google API Credentials 생성
    """

    oauth = (
        db.query(OAuthAccount)
        .filter(
            OAuthAccount.user_id == user_id,
            OAuthAccount.provider == "google",
        )
        .one_or_none()
    )

    if not oauth:
        raise RuntimeError("Google OAuth 인증이 필요합니다.")

    creds = Credentials(
        token=None,
        refresh_token=oauth.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=oauth.scope.split(" ") if oauth.scope else None,
    )

    if not creds.valid:
        creds.refresh(Request())

    return creds


def fetch_all_google_reviews() -> List[Dict]:
    """
    사장님 계정에 연결된 매장의 모든 리뷰 수집
    (심사 승인 후 정상 동작)
    """
    creds = load_credentials()

    # 1️⃣ Account 조회
    account_service = build(
        "mybusinessaccountmanagement",
        "v1",
        credentials=creds,
    )

    accounts = (
        account_service.accounts()
        .list()
        .execute()
        .get("accounts", [])
    )

    if not accounts:
        raise RuntimeError("연결된 Google Business 계정이 없습니다.")

    account_name = accounts[0]["name"]

    # 2️⃣ Location 조회
    location_service = build(
        "mybusinessbusinessinformation",
        "v1",
        credentials=creds,
    )

    locations = (
        location_service.accounts()
        .locations()
        .list(parent=account_name)
        .execute()
        .get("locations", [])
    )

    if not locations:
        raise RuntimeError("연결된 매장이 없습니다.")

    location_name = locations[0]["name"]

    # 3️⃣ Reviews 조회 (⚠️ Business Profile API 심사 승인 필요)
    review_service = build(
        "mybusiness",
        "v4",
        credentials=creds,
    )

    reviews: List[Dict] = []
    page_token = None

    while True:
        resp = (
            review_service.accounts()
            .locations()
            .reviews()
            .list(
                parent=location_name,
                pageToken=page_token,
            )
            .execute()
        )

        reviews.extend(resp.get("reviews", []))
        page_token = resp.get("nextPageToken")

        if not page_token:
            break

    return reviews


def extract_review_texts(reviews: List[Dict]) -> List[str]:
    """
    Google 리뷰 객체 → 분석용 텍스트 리스트
    """
    return [
        r["comment"]
        for r in reviews
        if r.get("comment")
    ]
