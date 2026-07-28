from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device
from app.core.config import settings


async def seed_devices(db: AsyncSession):

    result = await db.execute(
        select(Device)
    )

    devices = result.scalars().all()

    if devices:
        return

    for i in range(settings.DEFAULT_DEVICES_COUNT):

        db.add(
            Device(
                name=f"Fridge #{i + 1}",
                address=i + 1,
                location=f"Room {(i // 3) + 1}"
            )
        )

    await db.commit()