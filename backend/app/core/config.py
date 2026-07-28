from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    APP_NAME: str = "Fridge Monitor"

    DATABASE_URL: str = (
        "sqlite+aiosqlite:///./fridge.db"
    )

    POLL_INTERVAL_SECONDS: int = 5

    DEFAULT_DEVICES_COUNT: int = 10


    class Config:
        env_file = ".env"


settings = Settings()