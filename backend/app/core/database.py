from pathlib import Path

from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker
)

from app.core.config import settings


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False
)


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False
)


async def get_db():

    async with AsyncSessionLocal() as session:
        yield session


def _ensure_sqlite_dir():

    url = settings.DATABASE_URL

    if not url.startswith("sqlite"):
        return

    path = url.split("///")[-1]

    parent = Path(path).parent

    parent.mkdir(parents=True, exist_ok=True)


async def init_db():

    # from app.models.device import Device
    # from app.models.measurement import Measurement

    from app.models import Base

    _ensure_sqlite_dir()


    async with engine.begin() as conn:

        await conn.run_sync(
            Base.metadata.create_all
        )

        await conn.run_sync(_add_missing_columns)


def _add_missing_columns(conn):
    """Brings tables created by an older version up to the current models.

    create_all only creates missing tables and never touches existing ones,
    and Alembic is not set up yet. This covers the one kind of change made
    so far - new nullable or defaulted columns, plus their indexes - so an
    existing database on a server keeps its history.
    """

    from app.models import Base

    inspector = inspect(conn)

    for table in Base.metadata.sorted_tables:

        existing = {
            column["name"]
            for column in inspector.get_columns(table.name)
        }

        for column in table.columns:

            if column.name in existing:
                continue

            ddl = (
                f"ALTER TABLE {table.name} ADD COLUMN {column.name} "
                f"{column.type.compile(conn.dialect)}"
            )

            if column.server_default is not None:
                ddl += f" NOT NULL DEFAULT '{column.server_default.arg}'"

            conn.execute(text(ddl))

        for index in table.indexes:
            index.create(conn, checkfirst=True)