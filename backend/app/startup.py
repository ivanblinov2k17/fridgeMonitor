import asyncio
import logging

from sqlalchemy import delete, select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.device import Device
from app.models.measurement import Measurement
from app.services.seed import seed_devices


log = logging.getLogger("startup")


async def startup():

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    if settings.POLLER == "modbus":

        from app.services.poller_modbus import run

        async with AsyncSessionLocal() as db:
            await drop_mock_devices(db)

    else:

        from app.services.poller_mock import run

        async with AsyncSessionLocal() as db:
            await seed_devices(db)

    asyncio.create_task(run())


async def drop_mock_devices(db):
    """Removes the random demo devices once real sensors are polled.

    Mock devices have no module address. Their history is random numbers,
    so nothing of value is lost; switching back to POLLER=mock seeds them
    again.
    """

    mock_ids = select(Device.id).where(Device.unit.is_(None))

    removed = (
        await db.execute(delete(Measurement).where(Measurement.device_id.in_(mock_ids)))
    ).rowcount

    devices = (await db.execute(delete(Device).where(Device.unit.is_(None)))).rowcount

    await db.commit()

    if devices:
        log.info("Removed %s mock devices and %s mock measurements", devices, removed)
