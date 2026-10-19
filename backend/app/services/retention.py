"""Summarises old readings into buckets and drops the raw rows.

Six sensors polled every five seconds make about three million rows a
month, and every second would make five times that. Summaries are two
orders of magnitude smaller, so the history stays while the raw rows are
kept only for as long as anyone needs to look at an incident second by
second.

The job runs often and in small pieces rather than once a night: SQLite
takes one writer at a time, so a single large batch would stall polling
for as long as it ran. Every step is idempotent, so a restart in the
middle costs nothing - the next pass picks up what is left.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import bindparam, delete, func, select, text

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.measurement import Measurement
from app.models.rollup import MeasurementRollup


log = logging.getLogger("retention")


def _floor(moment: datetime, seconds: int) -> datetime:
    """Start of the bucket a moment falls into."""

    stamp = int(moment.timestamp())

    return datetime.fromtimestamp(stamp - stamp % seconds, timezone.utc)


def _db_time(value: datetime) -> str:
    # SQLAlchemy stores these as naive UTC text in this exact format, so
    # comparing strings compares moments.
    return value.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")


async def roll_up(now: datetime | None = None) -> int:
    """Summarises every bucket that is complete and not yet summarised.

    Returns the number of buckets written. The newest bucket is left
    alone until it has ended, otherwise it would be written half full and
    have to be corrected later.
    """

    bucket = settings.ROLLUP_BUCKET_SECONDS

    now = now or datetime.now(timezone.utc)

    # Everything before this is settled; the bucket containing "now" is not.
    boundary = _floor(now, bucket)

    written = 0

    async with AsyncSessionLocal() as db:

        # Start just after the newest bucket already written, so a pass
        # costs the same whether the history is a day or a year long.
        done_until = (
            await db.execute(select(func.max(MeasurementRollup.bucket_start)))
        ).scalar_one_or_none()

        if done_until is None:

            oldest = (
                await db.execute(select(func.min(Measurement.created_at)))
            ).scalar_one_or_none()

            if oldest is None:
                return 0

            if oldest.tzinfo is None:
                oldest = oldest.replace(tzinfo=timezone.utc)

            start_from = _floor(oldest, bucket)

        else:

            if done_until.tzinfo is None:
                done_until = done_until.replace(tzinfo=timezone.utc)

            start_from = done_until + timedelta(seconds=bucket)

        if start_from >= boundary:
            # Nothing has finished since the last pass.
            return 0

        rows = await db.execute(
            text(
                """
                SELECT
                    device_id,
                    CAST(strftime('%s', created_at) AS INTEGER) / :bucket
                        AS slot,
                    MIN(temperature) AS min_t,
                    AVG(temperature) AS avg_t,
                    MAX(temperature) AS max_t,
                    COUNT(*) AS n
                FROM measurements
                WHERE created_at >= :start_from
                  AND created_at < :boundary
                GROUP BY device_id, slot
                """
            ),
            {
                "bucket": bucket,
                "start_from": _db_time(start_from),
                "boundary": _db_time(boundary),
            },
        )

        for device_id, slot, min_t, avg_t, max_t, n in rows:

            db.add(
                MeasurementRollup(
                    device_id=device_id,
                    bucket_start=datetime.fromtimestamp(
                        slot * bucket, timezone.utc
                    ),
                    min_temp=min_t,
                    avg_temp=avg_t,
                    max_temp=max_t,
                    count=n,
                )
            )

            written += 1

        # One commit for the whole pass: a crash before it leaves nothing
        # half-written, and the next pass starts from the same place.
        await db.commit()

    if written:
        log.info("Summarised %s buckets", written)

    return written


async def prune_raw(now: datetime | None = None) -> int:
    """Deletes raw readings older than the retention window.

    Only touches what has already been summarised, so a failure to
    summarise can never turn into lost data.
    """

    if settings.RAW_RETENTION_DAYS <= 0:
        return 0

    now = now or datetime.now(timezone.utc)

    cutoff = _floor(
        now - timedelta(days=settings.RAW_RETENTION_DAYS),
        settings.ROLLUP_BUCKET_SECONDS,
    )

    async with AsyncSessionLocal() as db:

        summarised_until = (
            await db.execute(select(func.max(MeasurementRollup.bucket_start)))
        ).scalar_one_or_none()

        if summarised_until is None:
            return 0

        if summarised_until.tzinfo is None:
            summarised_until = summarised_until.replace(tzinfo=timezone.utc)

        # The newest summarised bucket itself stays until its own rows are
        # past the window, hence the earlier of the two.
        cutoff = min(cutoff, summarised_until)

    return await _delete_in_chunks(
        "measurements", "created_at", cutoff, "Pruned %s raw readings"
    )


async def prune_rollups(now: datetime | None = None) -> int:

    if settings.ROLLUP_RETENTION_DAYS <= 0:
        return 0

    now = now or datetime.now(timezone.utc)

    cutoff = now - timedelta(days=settings.ROLLUP_RETENTION_DAYS)

    return await _delete_in_chunks(
        "measurement_rollup", "bucket_start", cutoff, "Pruned %s summaries"
    )


async def _delete_in_chunks(
    table: str, column: str, cutoff: datetime, message: str
) -> int:
    """Deletes in small transactions so the write lock is never held long."""

    removed = 0

    while True:

        async with AsyncSessionLocal() as db:

            result = await db.execute(
                text(
                    f"""
                    DELETE FROM {table}
                    WHERE id IN (
                        SELECT id FROM {table}
                        WHERE {column} < :cutoff
                        LIMIT :chunk
                    )
                    """
                ),
                {
                    "cutoff": _db_time(cutoff),
                    "chunk": settings.PRUNE_CHUNK_ROWS,
                },
            )

            await db.commit()

        count = result.rowcount or 0

        removed += count

        if count < settings.PRUNE_CHUNK_ROWS:
            break

        # Let the poller write between chunks.
        await asyncio.sleep(0)

    if removed:
        log.info(message, removed)

    return removed


async def run_once(now: datetime | None = None) -> tuple[int, int, int]:

    buckets = await roll_up(now)
    raw = await prune_raw(now)
    old = await prune_rollups(now)

    return buckets, raw, old


async def run():
    """Background loop: summarise, then prune, on a fixed interval."""

    log.info(
        "Retention: %s s buckets every %s s, raw kept %s days, summaries %s",
        settings.ROLLUP_BUCKET_SECONDS,
        settings.ROLLUP_EVERY_SECONDS,
        settings.RAW_RETENTION_DAYS,
        f"{settings.ROLLUP_RETENTION_DAYS} days"
        if settings.ROLLUP_RETENTION_DAYS > 0
        else "kept",
    )

    while True:

        try:
            await run_once()

        except Exception:
            # A failed pass must not end the loop: the next one retries,
            # and nothing is deleted that was not summarised first.
            log.exception("Retention pass failed")

        await asyncio.sleep(settings.ROLLUP_EVERY_SECONDS)
