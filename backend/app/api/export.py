"""Temperature table for a period, as CSV that Excel opens directly.

One row per time step, one column per sensor. With readings every few
seconds a month is hundreds of thousands of rows, so values are averaged
over a step chosen by the user; step=0 gives the raw readings.

Formatted for Excel with Russian regional settings, which is what the
factory runs: ";" between fields, decimal comma, dd.mm.yyyy dates and a
UTF-8 BOM so Cyrillic sensor names are not garbled.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import bindparam, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.device import Device


router = APIRouter(prefix="/export", tags=["Export"])


ALLOWED_STEPS = {0, 60, 300, 900, 1800, 3600}

# Beyond this the browser and Excel struggle (Excel's own limit is ~1M).
MAX_ROWS = 200_000

# Raw readings of one poll differ by milliseconds between modules; grouping
# by the second puts them on one row.
RAW_BUCKET_SECONDS = 1


def _as_utc(value: datetime) -> datetime:

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _db_time(value: datetime) -> str:
    # Measurements are stored by SQLAlchemy as naive UTC text in exactly
    # this format, so comparing strings compares times.
    return value.strftime("%Y-%m-%d %H:%M:%S.%f")


def _number(value: float) -> str:
    return f"{value:.2f}".replace(".", ",")


def _cell(name: str) -> str:
    if any(c in name for c in ';"\n\r'):
        return '"' + name.replace('"', '""') + '"'
    return name


@router.get("/temperatures.csv")
async def export_temperatures(
    start: datetime,
    end: datetime,
    step: int = Query(300, description="Seconds to average over; 0 = raw"),
    device_id: int | None = None,
    tz_offset: int = Query(
        0, description="Viewer's UTC offset in minutes, for the time column"
    ),
    db: AsyncSession = Depends(get_db),
):

    if step not in ALLOWED_STEPS:
        raise HTTPException(400, f"step must be one of {sorted(ALLOWED_STEPS)}")

    start, end = _as_utc(start), _as_utc(end)

    if end <= start:
        raise HTTPException(400, "end must be after start")

    bucket = step or RAW_BUCKET_SECONDS

    if step and (end - start).total_seconds() / step > MAX_ROWS:
        raise HTTPException(
            400, "Too many rows for this period: choose a larger step"
        )

    devices_query = select(Device).order_by(Device.unit, Device.channel, Device.id)

    if device_id is not None:
        devices_query = devices_query.where(Device.id == device_id)

    devices = (await db.execute(devices_query)).scalars().all()

    if not devices:
        raise HTTPException(404, "No such device")

    rows = await db.execute(
        text(
            """
            SELECT
                device_id,
                CAST(strftime('%s', created_at) AS INTEGER) / :bucket AS slot,
                AVG(temperature) AS temperature
            FROM measurements
            WHERE created_at >= :start
              AND created_at < :end
              AND device_id IN :ids
            GROUP BY device_id, slot
            ORDER BY slot
            """
        ).bindparams(bindparam("ids", expanding=True)),
        {
            "bucket": bucket,
            "start": _db_time(start),
            "end": _db_time(end),
            "ids": [d.id for d in devices],
        },
    )

    table: dict[int, dict[int, float]] = {}

    for device, slot, temperature in rows:
        table.setdefault(slot, {})[device] = temperature

        if step == 0 and len(table) > MAX_ROWS:
            raise HTTPException(
                400, "Too many rows for this period: choose a larger step"
            )

    viewer_tz = timezone(timedelta(minutes=tz_offset))

    lines = [
        ";".join(["Time"] + [_cell(f"{d.name} ({d.location})") for d in devices])
    ]

    for slot in sorted(table):

        moment = datetime.fromtimestamp(slot * bucket, viewer_tz)
        values = table[slot]

        lines.append(
            ";".join(
                [moment.strftime("%d.%m.%Y %H:%M:%S")]
                + [
                    _number(values[d.id]) if d.id in values else ""
                    for d in devices
                ]
            )
        )

    local_start = start.astimezone(viewer_tz).strftime("%Y-%m-%d_%H%M")
    local_end = end.astimezone(viewer_tz).strftime("%Y-%m-%d_%H%M")

    return Response(
        content="﻿" + "\r\n".join(lines) + "\r\n",
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="temperatures_{local_start}_{local_end}.csv"'
            )
        },
    )
