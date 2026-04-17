from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import bindparam, text
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
        text(
            """
            SELECT
                id,
                company_name,
                category,
                signal_type_label,
                message,
                link_url,
                is_read,
                created_at,
                signal_id
            FROM public.notifications
            WHERE tenant_id = :tenant_id
              AND is_read = :is_read
            ORDER BY created_at DESC
            LIMIT 500
            """
        ),
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
    - signal_id 가 있으면 같은 signal_id 알림군 전체 읽음 처리
    - signal_id 가 없으면 tenant_id + company_name + category + signal_type_label + message + created_at::date 기준으로 읽음 처리
    - 프론트 optimistic UI 를 위해 updated_ids / updated_count 반환
    """
    base_row = db.execute(
        text(
            """
            SELECT
                id,
                tenant_id,
                signal_id,
                company_name,
                category,
                signal_type_label,
                message,
                created_at::date AS created_date
            FROM public.notifications
            WHERE id = :id
            """
        ),
        {"id": notification_id},
    ).mappings().first()

    if not base_row:
        raise HTTPException(status_code=404, detail="notification not found")

    if base_row["signal_id"] is not None:
        candidate_rows = db.execute(
            text(
                """
                SELECT id
                FROM public.notifications
                WHERE tenant_id = :tenant_id
                  AND signal_id = :signal_id
                  AND is_read = FALSE
                ORDER BY id
                """
            ),
            {
                "tenant_id": base_row["tenant_id"],
                "signal_id": base_row["signal_id"],
            },
        ).fetchall()
    else:
        candidate_rows = db.execute(
            text(
                """
                SELECT id
                FROM public.notifications
                WHERE tenant_id = :tenant_id
                  AND COALESCE(company_name, '') = COALESCE(:company_name, '')
                  AND COALESCE(category, '') = COALESCE(:category, '')
                  AND COALESCE(signal_type_label, '') = COALESCE(:signal_type_label, '')
                  AND COALESCE(message, '') = COALESCE(:message, '')
                  AND created_at::date = :created_date
                  AND is_read = FALSE
                ORDER BY id
                """
            ),
            {
                "tenant_id": base_row["tenant_id"],
                "company_name": base_row["company_name"],
                "category": base_row["category"],
                "signal_type_label": base_row["signal_type_label"],
                "message": base_row["message"],
                "created_date": base_row["created_date"],
            },
        ).fetchall()

    updated_ids = [row[0] for row in candidate_rows]

    if updated_ids:
        update_query = text(
            """
            UPDATE public.notifications
            SET is_read = TRUE
            WHERE id IN :ids
            """
        ).bindparams(bindparam("ids", expanding=True))

        db.execute(update_query, {"ids": updated_ids})
        db.commit()

    return {
        "status": "ok",
        "updated_ids": updated_ids,
        "updated_count": len(updated_ids),
    }


@router.patch("/read-all")
def mark_all_notifications_read(
    tenant_id: int = 7,
    db: Session = Depends(get_db),
):
    """
    전체 읽음 처리
    """
    candidate_rows = db.execute(
        text(
            """
            SELECT id
            FROM public.notifications
            WHERE tenant_id = :tenant_id
              AND is_read = FALSE
            ORDER BY id
            """
        ),
        {"tenant_id": tenant_id},
    ).fetchall()

    updated_ids = [row[0] for row in candidate_rows]

    if updated_ids:
        update_query = text(
            """
            UPDATE public.notifications
            SET is_read = TRUE
            WHERE id IN :ids
            """
        ).bindparams(bindparam("ids", expanding=True))

        db.execute(update_query, {"ids": updated_ids})
        db.commit()

    return {
        "status": "ok",
        "updated_ids": updated_ids,
        "updated_count": len(updated_ids),
    }
