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


def fetch_all_google_reviews(
    *,
    user_id: int,
    db: Session,
) -> List[Dict]:
    """
    로그인한 유저의 Google 계정 기준으로
    접근 가능한 모든 Account / 모든 Location의 리뷰 수집
    """

    # 🔑 user_id 기반 Credentials
    creds = load_credentials(
        user_id=user_id,
        db=db,
    )

    # 1️⃣ Business Account 조회
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
        return []

    # 2️⃣ Location 서비스
    location_service = build(
        "mybusinessbusinessinformation",
        "v1",
        credentials=creds,
    )

    # 3️⃣ Review 서비스 (최신)
    review_service = build(
        "mybusinessreviews",
        "v1",
        credentials=creds,
    )

    all_reviews: List[Dict] = []

    # 4️⃣ Account → Location → Review 전체 순회
    for account in accounts:
        account_name = account["name"]  # accounts/{accountId}

        locations = (
            location_service.accounts()
            .locations()
            .list(parent=account_name)
            .execute()
            .get("locations", [])
        )

        for loc in locations:
            location_name = loc["name"]  # accounts/.../locations/...

            request = (
                review_service.accounts()
                .locations()
                .reviews()
                .list(parent=location_name)
            )

            while request:
                response = request.execute()
                all_reviews.extend(response.get("reviews", []))

                request = (
                    review_service.accounts()
                    .locations()
                    .reviews()
                    .list_next(request, response)
                )

    return all_reviews


def extract_review_texts(reviews: List[Dict]) -> List[str]:
    """
    Google 리뷰 객체 → 분석용 텍스트 리스트
    """
    return [
        r["comment"]
        for r in reviews
        if r.get("comment")
    ]
