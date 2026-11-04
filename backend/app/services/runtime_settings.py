"""Settings the dashboard can change without a restart.

Only the poll interval lives here so far. The pollers read it at the top
of every cycle, so a change takes effect on the next reading instead of
needing the container restarted.
"""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.setting import Setting


log = logging.getLogger("settings")


POLL_INTERVAL = "poll_interval_seconds"


async def get_raw(db: AsyncSession, key: str) -> str | None:

    return (
        await db.execute(select(Setting.value).where(Setting.key == key))
    ).scalar_one_or_none()


async def set_raw(db: AsyncSession, key: str, value: str) -> None:
    """Writes the value; the caller commits."""

    row = (
        await db.execute(select(Setting).where(Setting.key == key))
    ).scalar_one_or_none()

    if row is None:
        db.add(Setting(key=key, value=value))
    else:
        row.value = value


async def get_poll_interval(db: AsyncSession) -> int:
    """Interval in seconds, falling back to the configured default.

    An unreadable or no-longer-offered value is ignored rather than
    obeyed: a typo in the database should not stop the polling.
    """

    stored = await get_raw(db, POLL_INTERVAL)

    if stored is None:
        return settings.POLL_INTERVAL_SECONDS

    try:
        value = int(stored)
    except ValueError:
        log.warning("Ignoring unreadable %s %r", POLL_INTERVAL, stored)
        return settings.POLL_INTERVAL_SECONDS

    if value not in settings.poll_interval_choices_list:
        log.warning(
            "Ignoring %s %s: not one of %s",
            POLL_INTERVAL, value, settings.poll_interval_choices_list,
        )
        return settings.POLL_INTERVAL_SECONDS

    return value


async def current_poll_interval() -> int:
    """Interval for a caller that has no session of its own."""

    async with AsyncSessionLocal() as db:
        return await get_poll_interval(db)
