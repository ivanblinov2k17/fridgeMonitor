from sqlalchemy import Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # Mock devices: 1, 2, 3... Real sensors: unit * 100 + channel, kept only
    # so the column stays unique and non-null on existing databases.
    address: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        nullable=False,
    )

    location: Mapped[str] = mapped_column(
        String(100),
        default="Unknown",
    )

    # Real sensors only: MV110 address on the RS-485 line and its input
    # (1..8). Both empty for mock devices.
    unit: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    channel: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    # Last sensor state: "ok", "open_circuit", "no_link"... see
    # app/services/modbus.py. Measurements are stored only while "ok", so
    # this is what tells a broken sensor from a quiet one.
    status: Mapped[str] = mapped_column(
        String(32),
        default="ok",
        server_default="ok",
        nullable=False,
    )

    measurements = relationship(
        "Measurement",
        back_populates="device",
        cascade="all, delete-orphan",
    )


Index(
    "idx_device_unit_channel",
    Device.unit,
    Device.channel,
    unique=True,
)
