from fastapi import WebSocket


class ConnectionManager:

    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.append(websocket)

    def disconnect(self, websocket: WebSocket):

        if websocket in self.connections:
            self.connections.remove(websocket)

    async def broadcast(self, data: dict):

        disconnected = []

        for ws in self.connections:

            try:
                await ws.send_json(data)
            except Exception:
                disconnected.append(ws)

        for ws in disconnected:
            self.disconnect(ws)


manager = ConnectionManager()