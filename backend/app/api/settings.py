from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings as config
from app.core.database import get_db
from app.services import runtime_settings

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingsResponse(BaseModel):
    poll_interval_seconds: int
    # What the dashboard may offer.
    poll_interval_choices: list[int]
    # Shown so it is clear how long raw readings stay before only the
    # summaries remain.
    raw_retention_days: int
    rollup_bucket_seconds: int


class SettingsUpdate(BaseModel):
    poll_interval_seconds: int


async def _current(db: AsyncSession) -> SettingsResponse:

    return SettingsResponse(
        poll_interval_seconds=await runtime_settings.get_poll_interval(db),
        poll_interval_choices=config.poll_interval_choices_list,
        raw_retention_days=config.RAW_RETENTION_DAYS,
        rollup_bucket_seconds=config.ROLLUP_BUCKET_SECONDS,
    )


@router.get("", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):

    return await _current(db)


@router.patch("", response_model=SettingsResponse)
async def update_settings(
    update: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Changes the poll interval. The pollers pick it up on the next cycle."""

    choices = config.poll_interval_choices_list

    if update.poll_interval_seconds not in choices:
        raise HTTPException(
            status_code=422,
            detail=f"poll_interval_seconds must be one of {choices}",
        )

    await runtime_settings.set_raw(
        db,
        runtime_settings.POLL_INTERVAL,
        str(update.poll_interval_seconds),
    )

    await db.commit()

    return await _current(db)
