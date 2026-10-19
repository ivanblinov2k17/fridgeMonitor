import asyncio
import random

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from datetime import datetime, timezone

from app.models.device import Device
from app.models.measurement import Measurement

from app.services import alarms
from app.services.websocket_manager import manager


device_temperatures = {}


async def initialize():

    async with AsyncSessionLocal() as db:

        devices = (
            await db.execute(
                select(Device).where(Device.unit.is_(None))
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
                    select(Device).where(Device.unit.is_(None))
                )
            ).scalars().all()

            now = datetime.now(timezone.utc)
            readings = []

            # Mock devices only: never invent numbers for real sensors left
            # from POLLER=modbus.
            for device in devices:

                current = device_temperatures.setdefault(
                    device.id, random.uniform(2.0, 6.0)
                )

                current += random.uniform(
                    -0.3,
                    0.3
                )

                current = round(current, 1)

                device_temperatures[device.id] = current

                measurement = Measurement(
                    device_id=device.id,
                    temperature=current,
                    created_at=now,
                )

                db.add(measurement)

                readings.append((device, "ok", current))

            alarm_by_device = await alarms.sync(db, readings, now)

            await db.commit()

        for device, _, current in readings:

            await manager.broadcast(
                {
                    "device_id": device.id,
                    "temperature": current,
                    "status": "ok",
                    "alarm": alarm_by_device.get(device.id),
                    "timestamp": now.isoformat(),
                }
            )

        await asyncio.sleep(
            settings.POLL_INTERVAL_SECONDS
        )