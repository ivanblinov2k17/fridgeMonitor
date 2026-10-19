from datetime import datetime

from pydantic import BaseModel


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
