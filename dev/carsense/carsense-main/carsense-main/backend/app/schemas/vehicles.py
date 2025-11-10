# app/schemas/vehicles.py
from typing import Optional
from pydantic import BaseModel, ConfigDict

class VehicleBase(BaseModel):
    make: str
    model: str
    year: Optional[int] = None
    odometer_km: Optional[int] = 0

class VehicleCreate(VehicleBase):
    pass

class VehicleOut(VehicleBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
