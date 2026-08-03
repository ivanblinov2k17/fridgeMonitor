from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, desc, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

from app.models.measurement import Measurement


router = APIRouter(
    prefix="/temperatures",
    tags=["Temperatures"]
)


@router.get("/latest")
async def latest(
    db: AsyncSession = Depends(get_db)
):

    # берем последние записи через оконную функцию

    query = """
    SELECT
        m.device_id,
        m.temperature,
        m.created_at
    FROM measurements m
    INNER JOIN
    (
        SELECT
            device_id,
            MAX(created_at) AS max_date
        FROM measurements
        GROUP BY device_id
    ) latest
    ON
        m.device_id = latest.device_id
        AND
        m.created_at = latest.max_date
    """

    result = await db.execute(
        text(query)
    )

    return [
        {
            "device_id": row.device_id,
            "temperature": row.temperature,
            "timestamp": row.created_at
        }
        for row in result
    ]


@router.get(
    "/devices/{device_id}/history"
)
async def history(
    device_id: int,
    hours: int = 24,
    db: AsyncSession = Depends(get_db)
):

    from_time = (
        datetime.now(timezone.utc)
        -
        timedelta(hours=hours)
    )


    result = await db.execute(
        select(Measurement)
        .where(
            Measurement.device_id == device_id,
            Measurement.created_at >= from_time
        )
        .order_by(
            Measurement.created_at
        )
    )


    return [
        {
            "temperature": item.temperature,
            "timestamp": item.created_at
        }
        for item in result.scalars()
    ]