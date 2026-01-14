import os
import pickle
from typing import List, Dict

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

# collectors 디렉토리 기준
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TOKEN_FILE = os.path.join(BASE_DIR, "token.pickle")


def load_credentials() -> Credentials:
    """
    OAuth 완료 후 저장된 credentials 로드
    - auth/google/login 에서 생성된 token.pickle 사용
    """
    if not os.path.exists(TOKEN_FILE):
        raise RuntimeError("Google OAuth 인증이 필요합니다.")

    with open(TOKEN_FILE, "rb") as f:
        return pickle.load(f)


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
