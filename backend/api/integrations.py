from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.db.models import OAuthAccount

router = APIRouter(
    prefix="/integrations",
    tags=["integrations"],
)


@router.get("/google/status")
def google_integration_status(
    request: Request,
    db: Session = Depends(get_db),
):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not logged in")

    account = (
        db.query(OAuthAccount)
        .filter_by(user_id=user_id, provider="google")
        .first()
    )

    return {"connected": bool(account)}