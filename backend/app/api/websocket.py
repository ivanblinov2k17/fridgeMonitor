from fastapi import APIRouter, WebSocket

from app.services.websocket_manager import manager


router = APIRouter(
    tags=["WebSocket"]
)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket
):

    await manager.connect(websocket)

    try:

        while True:

            # держим соединение открытым
            await websocket.receive_text()

    except Exception:

        manager.disconnect(websocket)