import asyncio

from app.core.database import AsyncSessionLocal

from app.services.seed import seed_devices
from app.services.poller_mock import run


async def startup():

    async with AsyncSessionLocal() as db:

        await seed_devices(db)

    asyncio.create_task(run())