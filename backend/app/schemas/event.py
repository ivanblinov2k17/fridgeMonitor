from datetime import datetime, timezone

from pydantic import BaseModel, field_validator


class EventResponse(BaseModel):
    id: int
    device_id: int
    device_name: str
    kind: str
    started_at: datetime
    # Empty while the alarm is still going.
    ended_at: datetime | None = None
    value: float | None = None
    peak: float | None = None

    @field_validator("started_at", "ended_at")
    @classmethod
    def as_utc(cls, value: datetime | None) -> datetime | None:
        """Marks the moment as UTC, which is what was stored.

        SQLite keeps no offset, so these come back naive. Serialised that
        way, a browser reads them as local time and an alarm that started a
        minute ago looks hours long.
        """

        if value is None or value.tzinfo is not None:
            return value

        return value.replace(tzinfo=timezone.utc)
