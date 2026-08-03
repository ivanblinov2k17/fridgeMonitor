from fastapi import FastAPI

from app.api.devices import router as device_router
from app.api.temperatures import router as temperature_router
from app.api.websocket import router as websocket_router
from app.core.database import init_db
from fastapi.middleware.cors import CORSMiddleware

from app.startup import startup

app = FastAPI(
    title="Fridge Monitor API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Or ["*"] for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.on_event("startup")
async def on_startup():

    await init_db()

    await startup()


app.include_router(device_router)
app.include_router(temperature_router)
app.include_router(
    websocket_router
)


@app.get("/")
async def root():

    return {
        "status": "running"
    }