import os
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

BUSINESS_SCOPES = ["https://www.googleapis.com/auth/business.manage"]

def get_google_business_access_token(refresh_token: str) -> str:
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=BUSINESS_SCOPES,
    )

    creds.refresh(Request())
    return creds.token
