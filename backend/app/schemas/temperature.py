from datetime import datetime

from pydantic import BaseModel


class TemperatureResponse(BaseModel):
    temperature: float
    timestamp: datetime

    model_config = {
        "from_attributes": True
    }


class LatestTemperatureResponse(BaseModel):
    device_id: int
    device_name: str
    temperature: float
    timestamp: datetime