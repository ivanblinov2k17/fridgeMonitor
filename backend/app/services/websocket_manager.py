from fastapi import WebSocket


class ConnectionManager:

    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.append(websocket)

        print(f"Client connected. Total: {len(self.connections)}")

    def disconnect(self, websocket: WebSocket):

        if websocket in self.connections:
            self.connections.remove(websocket)

        print(f"Client disconnected. Total: {len(self.connections)}")

    async def broadcast(self, data: dict):
        # print(
        #     f"Broadcast to {len(self.connections)} clients:",
        #     data
        # )
        disconnected = []

        for ws in self.connections:

            try:
                await ws.send_json(data)

            except Exception as e:
                print("Broadcast error:", repr(e))
                disconnected.append(ws)

        for ws in disconnected:
            self.disconnect(ws)


manager = ConnectionManager()