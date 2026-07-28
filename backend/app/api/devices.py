from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.device import Device
from app.schemas.device import DeviceResponse

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("", response_model=list[DeviceResponse])
async def get_devices(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Device)
    )

    return result.scalars().all()


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: int,
    db: AsyncSession = Depends(get_db),
):
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