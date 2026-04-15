from __future__ import annotations

import os
import redis

_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        url = os.getenv("REDIS_URL")
        if not url:
            raise RuntimeError("REDIS_URL 환경변수가 설정되지 않았습니다.")
        _client = redis.from_url(url, decode_responses=True)
    return _client


def publish(channel: str, message: str) -> None:
    get_redis().publish(channel, message)