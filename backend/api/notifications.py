from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.db.session import get_db

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def get_notifications(
    tenant_id: int = Query(default=7),
    is_read: Optional[bool] = Query(default=False),
    db: Session = Depends(get_db),
):
    """
    미읽음 알림 조회 (브라우저 열릴 때 호출)
    """
    rows = db.execute(
        text("""
            SELECT
                id,
                company_name,
                category,
                signal_type_label,
                message,
                link_url,
                is_read,
                created_at
            FROM public.notifications
            WHERE tenant_id = :tenant_id
              AND is_read = :is_read
            ORDER BY created_at DESC
            LIMIT 100
        """),
        {"tenant_id": tenant_id, "is_read": is_read},
    ).mappings().all()

    return [dict(r) for r in rows]


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