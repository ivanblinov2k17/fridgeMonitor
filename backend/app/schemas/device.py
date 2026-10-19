from pydantic import BaseModel, Field, model_validator


class DeviceResponse(BaseModel):
    id: int
    name: str
    address: int
    location: str
    unit: int | None = None
    channel: int | None = None
    status: str = "ok"
    # Alarm limits, empty when that end is not watched.
    min_temp: float | None = None
    max_temp: float | None = None
    # Alarm currently open on this device, if any.
    alarm: str | None = None

    model_config = {
        "from_attributes": True
    }


class DeviceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    location: str | None = Field(default=None, max_length=100)
    # Sent as null to stop watching that end.
    min_temp: float | None = None
    max_temp: float | None = None

    @model_validator(mode="after")
    def check_limits(self):

        low = self.min_temp
        high = self.max_temp

        if low is not None and high is not None and low >= high:
            raise ValueError(
                "min_temp must be below max_temp"
            )

        return self
