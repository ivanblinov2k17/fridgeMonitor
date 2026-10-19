from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class Setting(Base):
    """Settings changed while the service runs, kept as text.

    Environment variables need a restart to take effect, which is no way
    to offer a control in the dashboard. Only settings that are meant to
    be changed from the interface live here; everything else stays in the
    environment, where it belongs.
    """

    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
    )

    value: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
