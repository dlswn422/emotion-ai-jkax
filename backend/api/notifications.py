from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
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
            LIMIT 500
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
    - 같은 알림군 전체를 읽음 처리
    - 그룹 기준: tenant_id + company_name + category + signal_type_label + message + created_at::date
    """
    row = db.execute(
        text("""
            SELECT
                id,
                tenant_id,
                company_name,
                category,
                signal_type_label,
                message,
                created_at::date AS created_date
            FROM public.notifications
            WHERE id = :id
        """),
        {"id": notification_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="notification not found")

    result = db.execute(
        text("""
            UPDATE public.notifications
            SET is_read = TRUE
            WHERE tenant_id = :tenant_id
              AND COALESCE(company_name, '') = COALESCE(:company_name, '')
              AND COALESCE(category, '') = COALESCE(:category, '')
              AND COALESCE(signal_type_label, '') = COALESCE(:signal_type_label, '')
              AND COALESCE(message, '') = COALESCE(:message, '')
              AND created_at::date = :created_date
              AND is_read = FALSE
        """),
        {
            "tenant_id": row["tenant_id"],
            "company_name": row["company_name"],
            "category": row["category"],
            "signal_type_label": row["signal_type_label"],
            "message": row["message"],
            "created_date": row["created_date"],
        },
    )
    db.commit()

    return {
        "status": "ok",
        "updated": result.rowcount or 0,
    }


@router.patch("/read-all")
def mark_all_notifications_read(
    tenant_id: int = 7,
    db: Session = Depends(get_db),
):
    """
    전체 읽음 처리
    """
    result = db.execute(
        text("""
            UPDATE public.notifications
            SET is_read = TRUE
            WHERE tenant_id = :tenant_id
              AND is_read = FALSE
        """),
        {"tenant_id": tenant_id},
    )
    db.commit()

    return {
        "status": "ok",
        "updated": result.rowcount or 0,
    }