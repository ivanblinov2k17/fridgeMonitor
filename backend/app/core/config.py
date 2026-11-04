from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    APP_NAME: str = "Fridge Monitor"

    DATABASE_URL: str = (
        "sqlite+aiosqlite:///./fridge.db"
    )

    POLL_INTERVAL_SECONDS: int = 5

    DEFAULT_DEVICES_COUNT: int = 10

    # Where readings come from: "mock" (random numbers, for the demo) or
    # "modbus" (MV110 modules behind an MKON gateway).
    POLLER: str = "mock"

    MODBUS_HOST: str = "192.168.1.31"

    MODBUS_PORT: int = 502

    # Must be longer than the gateway's own wait for the RS-485 reply,
    # otherwise its "no answer" (exception 11) is cut off as a timeout.
    MODBUS_TIMEOUT_SECONDS: float = 2.0

    # Addresses to look for modules at: "2-16", "2,3,5" or "2-10,20".
    # Address 1 belongs to the MKON gateway itself.
    MODBUS_UNITS: str = "2-16"

    # Values the dashboard offers for the poll interval, in seconds. The
    # stored setting is checked against this list.
    POLL_INTERVAL_CHOICES: str = "1,5,10,30"

    # Readings are summarised into buckets of this length and the raw rows
    # are dropped once they are older than the window below. The bucket
    # matches the export's default step.
    ROLLUP_BUCKET_SECONDS: int = 300

    # How often the summarising job runs. Small and frequent on purpose:
    # SQLite takes one writer at a time, so a nightly batch would stall
    # polling for as long as it ran.
    ROLLUP_EVERY_SECONDS: int = 3600

    RAW_RETENTION_DAYS: int = 14

    # 0 keeps summaries forever, which is the point of making them.
    ROLLUP_RETENTION_DAYS: int = 0

    # Rows touched per transaction while pruning, so the write lock is
    # never held for long.
    PRUNE_CHUNK_ROWS: int = 5000

    # Limits given to a newly discovered sensor, in °C. Existing devices
    # keep whatever they have; both are set per device afterwards.
    DEFAULT_MIN_TEMP: float = 2.0

    DEFAULT_MAX_TEMP: float = 6.0

    # How far back inside the limits a temperature must come before the
    # alarm clears. Without it a reading sitting on the limit opens and
    # closes an event every poll.
    ALARM_HYSTERESIS_C: float = 0.3

    # Comma-separated list of allowed browser origins.
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:

        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


    @property
    def poll_interval_choices_list(self) -> list[int]:

        choices = []

        for part in self.POLL_INTERVAL_CHOICES.split(","):

            part = part.strip()

            if part.isdigit() and int(part) > 0:
                choices.append(int(part))

        return sorted(set(choices)) or [self.POLL_INTERVAL_SECONDS]


    @property
    def modbus_units_list(self) -> list[int]:

        units: set[int] = set()

        for part in self.MODBUS_UNITS.split(","):

            part = part.strip()

            if not part:
                continue

            if "-" in part:
                first, last = (int(x) for x in part.split("-", 1))
                units.update(range(first, last + 1))
            else:
                units.add(int(part))

        # 1 is the gateway, 248+ are reserved by Modbus.
        return sorted(u for u in units if 2 <= u <= 247)


    class Config:
        env_file = ".env"


settings = Settings()