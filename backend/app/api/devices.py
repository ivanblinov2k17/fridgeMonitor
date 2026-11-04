from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.device import Device
from app.models.event import Event
from app.schemas.device import DeviceResponse, DeviceUpdate

router = APIRouter(prefix="/devices", tags=["Devices"])


async def _open_alarms(db: AsyncSession, device_ids) -> dict[int, str]:
    """Alarm kind per device for the alarms currently open."""

    rows = await db.execute(
        select(Event.device_id, Event.kind).where(
            Event.device_id.in_(device_ids),
            Event.ended_at.is_(None),
        )
    )

    return {device_id: kind for device_id, kind in rows}


async def _with_alarm(db: AsyncSession, device: Device) -> DeviceResponse:

    alarms = await _open_alarms(db, [device.id])

    response = DeviceResponse.model_validate(device)
    response.alarm = alarms.get(device.id)

    return response


@router.get("", response_model=list[DeviceResponse])
async def get_devices(
    db: AsyncSession = Depends(get_db),
):
    devices = (
        await db.execute(
            select(Device).order_by(Device.unit, Device.channel, Device.id)
        )
    ).scalars().all()

    alarms = await _open_alarms(db, [device.id for device in devices])

    responses = []

    for device in devices:
        response = DeviceResponse.model_validate(device)
        response.alarm = alarms.get(device.id)
        responses.append(response)

    return responses


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
    device = await _get_or_404(db, device_id)

    return await _with_alarm(db, device)


@router.patch("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: int,
    update: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Renames a sensor and sets its alarm limits.

    Real sensors are created as "Sensor U.N" / "MV110 #U". A limit sent as
    null stops that end being watched; a name or location cannot be
    emptied, so null there means "leave alone".
    """

    device = await _get_or_404(db, device_id)

    changes = update.model_dump(exclude_unset=True)

    low = changes.get("min_temp", device.min_temp)
    high = changes.get("max_temp", device.max_temp)

    # The payload alone cannot be trusted here: sending only one limit must
    # still not end up below or above the one already stored.
    if low is not None and high is not None and low >= high:
        raise HTTPException(
            status_code=422,
            detail="min_temp must be below max_temp",
        )

    for field, value in changes.items():

        if value is None and field in ("name", "location"):
            continue

        setattr(device, field, value)

    await db.commit()

    return await _with_alarm(db, device)
