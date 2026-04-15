from __future__ import annotations

import socketio

# ASGI 호환 Socket.io 서버
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
)


@sio.event
async def connect(sid, environ):
    print(f"[Socket.io] 클라이언트 연결: {sid}")


@sio.event
async def disconnect(sid):
    print(f"[Socket.io] 클라이언트 연결 해제: {sid}")


@sio.event
async def join_room(sid, data):
    """
    클라이언트가 tenant_id 기반 room에 참여.
    프론트엔드에서 연결 후 호출해야 함.
    """
    room = str(data.get("tenant_id", ""))
    if room:
        await sio.enter_room(sid, room)
        print(f"[Socket.io] {sid} → room_{room} 입장")


async def emit_new_alert(tenant_id: int, data: dict) -> None:
    """
    특정 tenant room에 알림 이벤트 발송.
    """
    await sio.emit("new_alert", data, room=str(tenant_id))
    print(f"[Socket.io] new_alert 발송 → room_{tenant_id}")