# app/schemas/reminders.py
from typing import Optional, Literal
from datetime import date
from pydantic import BaseModel, ConfigDict

Kind = Literal["date", "odometer"]

class ReminderBase(BaseModel):
    vehicle_id: int
    kind: Kind
    due_date: Optional[date] = None
    due_km: Optional[int] = None
    notes: Optional[str] = None

class ReminderCreate(ReminderBase):
    pass

class ReminderOut(ReminderBase):
    id: int
    done: bool = False
    model_config = ConfigDict(from_attributes=True)
