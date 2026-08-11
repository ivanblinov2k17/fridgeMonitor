from pathlib import Path

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