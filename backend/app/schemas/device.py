from pydantic import BaseModel


class DeviceResponse(BaseModel):
    id: int
    name: str
    address: int
    location: str

    model_config = {
        "from_attributes": True
    }