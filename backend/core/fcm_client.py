from __future__ import annotations

import json
import os
from typing import List

import firebase_admin
from firebase_admin import credentials, messaging


def _initialize() -> None:
    if firebase_admin._apps:
        return

    creds_env = os.getenv("FIREBASE_CREDENTIALS")
    creds_path = os.path.join(
        os.path.dirname(__file__), "..", "firebase_credentials.json"
    )

    if creds_env:
        cred = credentials.Certificate(json.loads(creds_env))
    elif os.path.exists(creds_path):
        cred = credentials.Certificate(creds_path)
    else:
        raise RuntimeError("Firebase 인증 정보가 없습니다. FIREBASE_CREDENTIALS 환경변수 또는 firebase_credentials.json 파일이 필요합니다.")

    firebase_admin.initialize_app(cred)


def send_fcm_to_devices(tokens: List[str], title: str, body: str) -> None:
    """
    등록된 기기 토큰 목록에 FCM 푸시 알림 일괄 발송.
    """
    if not tokens:
        print("[FCM] 등록된 기기 없음 — 발송 스킵")
        return

    _initialize()

    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        tokens=tokens,
    )

    response = messaging.send_each_for_multicast(message)
    print(f"[FCM] 발송 완료 — 성공: {response.success_count} / 실패: {response.failure_count}")

    # 실패한 토큰 로그
    for idx, resp in enumerate(response.responses):
        if not resp.success:
            print(f"[FCM] 실패 토큰 [{idx}]: {resp.exception}")