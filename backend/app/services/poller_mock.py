import asyncio
import random

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal

from app.models.device import Device
from app.models.measurement import Measurement

from app.services.websocket_manager import manager


device_temperatures = {}


async def initialize():

    async with AsyncSessionLocal() as db:

        devices = (
            await db.execute(
                select(Device)
            )
        ).scalars().all()

        for device in devices:

            device_temperatures[device.id] = random.uniform(
                2.0,
                6.0
            )


async def run():

    await initialize()

    while True:

        async with AsyncSessionLocal() as db:

            devices = (
                await db.execute(
                    select(Device)
                )
            ).scalars().all()

            for device in devices:

                current = device_temperatures[device.id]

                current += random.uniform(
                    -0.3,
                    0.3
                )

                current = round(current, 1)

                device_temperatures[device.id] = current

                measurement = Measurement(
                    device_id=device.id,
                    temperature=current
                )

                db.add(measurement)

                await manager.broadcast(
                    {
                        "deviceId": device.id,
                        "temperature": current,
                    }
                )

            await db.commit()

        await asyncio.sleep(
            settings.POLL_INTERVAL_SECONDS
        )