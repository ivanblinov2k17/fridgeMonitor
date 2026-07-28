from fastapi import FastAPI

from app.api.devices import router as device_router
from app.api.temperatures import router as temperature_router

from app.core.database import init_db

from app.startup import startup

app = FastAPI(
    title="Fridge Monitor API"
)


@app.on_event("startup")
async def on_startup():

    await init_db()

    await startup()


app.include_router(device_router)
app.include_router(temperature_router)


@app.get("/")
async def root():

    return {
        "status": "running"
    }