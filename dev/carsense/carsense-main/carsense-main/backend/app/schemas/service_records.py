# backend/app/schemas/service_records.py
from datetime import date as Date
from typing import Optional
from pydantic import BaseModel

class ServiceBase(BaseModel):
    vehicle_id: int
    service_type: str
    date: Optional[Date] = None
    km: Optional[int] = None
    notes: Optional[str] = None

class ServiceCreate(ServiceBase):
    pass

class ServiceOut(ServiceBase):
    id: int

    class Config:
        from_attributes = True  # Pydantic v2
