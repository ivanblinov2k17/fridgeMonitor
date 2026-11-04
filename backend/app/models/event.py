from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class Event(Base):
    """One alarm, from the moment it started until it cleared.

    Measurements are only stored while a sensor reads correctly, so without
    this table a fault leaves nothing behind but a gap in the chart and the
    device's current status. An event records what happened and for how
    long, which is what a notification and a report are built on.
    """

    __tablename__ = "events"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    device_id: Mapped[int] = mapped_column(
        ForeignKey("devices.id"),
        nullable=False,
    )

    # Either a sensor fault ("open_circuit", "no_link"... see
    # app/services/modbus.py) or a configured limit being crossed
    # ("above_limit", "below_limit").
    kind: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Open while the alarm is still going.
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Reading that opened the alarm, and the furthest it went from the
    # limit afterwards. Empty for faults, which report no temperature.
    value: Mapped[float | None] = mapped_column(Float, nullable=True)

    peak: Mapped[float | None] = mapped_column(Float, nullable=True)

    device = relationship("Device", back_populates="events")


Index(
    "idx_event_device_started",
    Event.device_id,
    Event.started_at,
)

# Looking up what is currently wrong happens every poll cycle.
Index(
    "idx_event_open",
    Event.device_id,
    Event.ended_at,
)
