"""Decides what is currently wrong with a device and keeps the event log.

Both pollers feed readings through sync(): it opens an event when an alarm
starts, closes it when the alarm clears, and leaves an already-open one
alone. Nothing here sends anything - it only records, so a notification
added later has a start, an end and a peak to talk about.
"""

import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.device import Device
from app.models.event import Event


log = logging.getLogger("alarms")


ABOVE_LIMIT = "above_limit"
BELOW_LIMIT = "below_limit"

# A sensor that is still warming up or deliberately switched off is not an
# alarm; everything else the module reports is.
NOT_ALARMING = {"ok", "not_ready", "disabled"}


def is_fault(status: str) -> bool:
    return status not in NOT_ALARMING


def current_kind(
    device: Device,
    status: str,
    temperature: float | None,
    open_kind: str | None,
) -> str | None:
    """What is wrong right now, or None when all is well.

    A fault outranks the limits: when the sensor is broken the module's
    number is stale, so comparing it to anything is meaningless.
    """

    if status != "ok":
        return status if is_fault(status) else None

    if temperature is None:
        return None

    if device.max_temp is not None and temperature > device.max_temp:
        return ABOVE_LIMIT

    if device.min_temp is not None and temperature < device.min_temp:
        return BELOW_LIMIT

    # Clearing takes a margin, otherwise a temperature sitting on the limit
    # opens and closes an event on every poll and the log becomes noise.
    margin = settings.ALARM_HYSTERESIS_C

    if (
        open_kind == ABOVE_LIMIT
        and device.max_temp is not None
        and temperature > device.max_temp - margin
    ):
        return ABOVE_LIMIT

    if (
        open_kind == BELOW_LIMIT
        and device.min_temp is not None
        and temperature < device.min_temp + margin
    ):
        return BELOW_LIMIT

    return None


def _further(kind: str, peak: float | None, value: float) -> float:
    """Keeps the worst reading seen while the alarm has been open."""

    if peak is None:
        return value

    if kind == BELOW_LIMIT:
        return min(peak, value)

    return max(peak, value)


async def sync(
    db: AsyncSession,
    readings: list[tuple[Device, str, float | None]],
    now: datetime,
) -> dict[int, str | None]:
    """Updates the event log for a batch of readings.

    Returns the current alarm per device id, for the dashboard to show.
    Does not commit: the caller does that together with its own writes.
    """

    if not readings:
        return {}

    device_ids = [device.id for device, _, _ in readings]

    open_events = {
        event.device_id: event
        for event in (
            await db.execute(
                select(Event).where(
                    Event.device_id.in_(device_ids),
                    Event.ended_at.is_(None),
                )
            )
        ).scalars()
    }

    result: dict[int, str | None] = {}

    for device, status, temperature in readings:

        open_event = open_events.get(device.id)
        open_kind = open_event.kind if open_event else None

        kind = current_kind(device, status, temperature, open_kind)

        result[device.id] = kind

        if kind is None:

            if open_event is not None:
                open_event.ended_at = now
                log.info(
                    "Alarm cleared on %s (%s): %s",
                    device.name, device.id, open_event.kind,
                )

            continue

        if open_event is not None and open_event.kind == kind:

            if temperature is not None:
                open_event.peak = _further(kind, open_event.peak, temperature)

            continue

        if open_event is not None:
            # Changed into a different alarm, e.g. too warm then a break.
            open_event.ended_at = now

        db.add(
            Event(
                device_id=device.id,
                kind=kind,
                started_at=now,
                value=temperature,
                peak=temperature,
            )
        )

        log.info("Alarm on %s (%s): %s", device.name, device.id, kind)

    return result
