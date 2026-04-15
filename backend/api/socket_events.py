from __future__ import annotations

import asyncio
import json
import os

import redis.asyncio as aioredis

from backend.core.socket_manager import emit_new_alert


ALERT_CHANNEL = "alert_channel"


async def redis_listener() -> None:
    """
    Redis alert_channel을 구독하다가 메시지가 오면
    Socket.io로 해당 tenant room에 실시간 push.
    """
    url = os.getenv("REDIS_URL")
    if not url:
        print("[Redis Listener] REDIS_URL 없음 — 리스너 시작 안 함")
        return

    print(f"[Redis Listener] 구독 시작: {ALERT_CHANNEL}")

    while True:
        try:
            client = aioredis.from_url(url, decode_responses=True)
            pubsub = client.pubsub()
            await pubsub.subscribe(ALERT_CHANNEL)

            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue

                try:
                    data = json.loads(message["data"])
                    tenant_id = data.get("tenant_id", 7)
                    print(f"[Redis Listener] 메시지 수신: {data}")
                    await emit_new_alert(tenant_id, data)
                except Exception as e:
                    print(f"[Redis Listener] 메시지 처리 오류: {e}")

        except Exception as e:
            print(f"[Redis Listener] 연결 오류: {e} — 5초 후 재연결")
            await asyncio.sleep(5)