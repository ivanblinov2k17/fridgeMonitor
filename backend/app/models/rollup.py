from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class MeasurementRollup(Base):
    """One bucket of readings for one device, kept after the raw rows go.

    Raw measurements are deleted once they are older than the retention
    window; these summaries stay, so a chart or a report covering last
    quarter still has something to show.

    Both ends are stored, not just the average: in cold storage the point
    of the record is usually the excursion, and a spike lasting half a
    minute disappears from a five-minute mean but survives in max.
    """

    __tablename__ = "measurement_rollup"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    device_id: Mapped[int] = mapped_column(
        ForeignKey("devices.id"),
        nullable=False,
    )

    # Start of the bucket, aligned to ROLLUP_BUCKET_SECONDS, in UTC.
    bucket_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    min_temp: Mapped[float] = mapped_column(Float, nullable=False)

    avg_temp: Mapped[float] = mapped_column(Float, nullable=False)

    max_temp: Mapped[float] = mapped_column(Float, nullable=False)

    # Readings behind this bucket, so averages can be combined correctly
    # when several buckets are merged into a coarser step.
    count: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        # Lets the job rewrite a bucket instead of doubling it.
        UniqueConstraint(
            "device_id", "bucket_start", name="uq_rollup_device_bucket"
        ),
    )


Index(
    "idx_rollup_device_bucket",
    MeasurementRollup.device_id,
    MeasurementRollup.bucket_start,
)
