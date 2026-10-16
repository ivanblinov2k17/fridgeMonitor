from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.device import Device
from app.schemas.device import DeviceResponse, DeviceUpdate

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("", response_model=list[DeviceResponse])
async def get_devices(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Device).order_by(Device.unit, Device.channel, Device.id)
    )

    return result.scalars().all()


async def _get_or_404(db: AsyncSession, device_id: int) -> Device:

    result = await db.execute(
        select(Device).where(Device.id == device_id)
    )

    device = result.scalar_one_or_none()

    if device is None:
        raise HTTPException(
            status_code=404,
            detail="Device not found",
        )

    return device


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await _get_or_404(db, device_id)


@router.patch("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: int,
    update: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Renames a sensor: real ones are created as "Sensor U.N" / "MV110 #U"."""

    device = await _get_or_404(db, device_id)

    for field, value in update.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(device, field, value)

    await db.commit()

    return device
