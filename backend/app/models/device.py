from sqlalchemy import Integer, String
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

    address: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        nullable=False,
    )

    location: Mapped[str] = mapped_column(
        String(100),
        default="Unknown",
    )

    measurements = relationship(
        "Measurement",
        back_populates="device",
        cascade="all, delete-orphan",
    )