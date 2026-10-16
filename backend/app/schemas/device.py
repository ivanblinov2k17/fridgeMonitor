from pydantic import BaseModel, Field


class DeviceResponse(BaseModel):
    id: int
    name: str
    address: int
    location: str
    unit: int | None = None
    channel: int | None = None
    status: str = "ok"

    model_config = {
        "from_attributes": True
    }


class DeviceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    location: str | None = Field(default=None, max_length=100)
