from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.db.session import get_db

router = APIRouter(prefix="/api", tags=["devices"])


@router.post("/register-device")
def register_device(data: dict, db: Session = Depends(get_db)):
    """
    APK 최초 실행 시 기기 등록 / 토큰 갱신.
    device_id가 이미 있으면 fcm_token만 업데이트 (UPSERT).
    """
    device_id = data.get("device_id")
    fcm_token = data.get("fcm_token")
    owner_name = data.get("owner_name")

    if not device_id or not fcm_token:
        return {"status": "error", "message": "device_id와 fcm_token은 필수입니다."}

    db.execute(
        text("""
            INSERT INTO registered_devices (device_id, fcm_token, owner_name, updated_at)
            VALUES (:device_id, :fcm_token, :owner_name, NOW())
            ON CONFLICT (device_id)
            DO UPDATE SET
                fcm_token  = EXCLUDED.fcm_token,
                updated_at = NOW()
        """),
        {"device_id": device_id, "fcm_token": fcm_token, "owner_name": owner_name},
    )
    db.commit()

    return {"status": "success", "message": "기기 등록/업데이트 완료"}


@router.get("/devices")
def list_devices(db: Session = Depends(get_db)):
    """
    등록된 기기 목록 조회 (관리용).
    """
    rows = db.execute(
        text("""
            SELECT device_id, owner_name, is_active, updated_at
            FROM registered_devices
            ORDER BY updated_at DESC
        """)
    ).mappings().all()

    return [dict(r) for r in rows]