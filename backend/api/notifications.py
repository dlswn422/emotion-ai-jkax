from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.db.session import get_db

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
):
    """
    단건 읽음 처리
    """
    db.execute(
        text("""
            UPDATE public.notifications
            SET is_read = TRUE
            WHERE id = :id
        """),
        {"id": notification_id},
    )
    db.commit()
    return {"status": "ok"}


@router.patch("/read-all")
def mark_all_notifications_read(
    tenant_id: int = 7,
    db: Session = Depends(get_db),
):
    """
    전체 읽음 처리
    """
    db.execute(
        text("""
            UPDATE public.notifications
            SET is_read = TRUE
            WHERE tenant_id = :tenant_id
              AND is_read = FALSE
        """),
        {"tenant_id": tenant_id},
    )
    db.commit()
    return {"status": "ok"}