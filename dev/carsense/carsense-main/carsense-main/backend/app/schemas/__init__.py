# app/schemas/__init__.py
from .vehicles import VehicleCreate, VehicleOut
from .service_records import ServiceCreate, ServiceOut

__all__ = [
    "VehicleCreate", "VehicleOut",
    "ServiceCreate", "ServiceOut",
]
