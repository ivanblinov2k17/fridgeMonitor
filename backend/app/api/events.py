from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.device import Device
from app.models.event import Event
from app.schemas.event import EventResponse

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("", response_model=list[EventResponse])
async def get_events(
    device_id: int | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    open_only: bool = False,
    limit: int = Query(default=200, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
):
    """Alarms, newest first. Open ones have no ended_at."""

    query = (
        select(Event, Device.name)
        .join(Device, Device.id == Event.device_id)
        .order_by(desc(Event.started_at), desc(Event.id))
        .limit(limit)
    )

    if device_id is not None:
        query = query.where(Event.device_id == device_id)

    if open_only:
        query = query.where(Event.ended_at.is_(None))

    if since is not None:
        # An alarm that started earlier but is still going overlaps the
        # window too, so it belongs in the answer.
        query = query.where(
            (Event.ended_at.is_(None)) | (Event.ended_at >= since)
        )

    if until is not None:
        query = query.where(Event.started_at <= until)

    rows = await db.execute(query)

    return [
        EventResponse(
            id=event.id,
            device_id=event.device_id,
            device_name=name,
            kind=event.kind,
            started_at=event.started_at,
            ended_at=event.ended_at,
            value=event.value,
            peak=event.peak,
        )
        for event, name in rows
    ]
