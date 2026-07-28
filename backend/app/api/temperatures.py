from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.device import Device
from app.models.measurement import Measurement

router = APIRouter(
    prefix="/temperatures",
    tags=["Temperatures"],
)


@router.get("/latest")
async def latest(
    db: AsyncSession = Depends(get_db),
):

    devices = (
        await db.execute(
            select(Device)
        )
    ).scalars().all()

    response = []

    for device in devices:

        measurement = (
            await db.execute(
                select(Measurement)
                .where(
                    Measurement.device_id == device.id
                )
                .order_by(
                    desc(Measurement.created_at)
                )
                .limit(1)
            )
        ).scalar_one_or_none()

        if measurement:

            response.append(
                {
                    "device_id": device.id,
                    "device_name": device.name,
                    "temperature": measurement.temperature,
                    "timestamp": measurement.created_at,
                }
            )

    return response