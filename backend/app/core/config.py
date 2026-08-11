from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    APP_NAME: str = "Fridge Monitor"

    DATABASE_URL: str = (
        "sqlite+aiosqlite:///./fridge.db"
    )

    POLL_INTERVAL_SECONDS: int = 5

    DEFAULT_DEVICES_COUNT: int = 10

    # Comma-separated list of allowed browser origins.
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:

        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


    class Config:
        env_file = ".env"


settings = Settings()