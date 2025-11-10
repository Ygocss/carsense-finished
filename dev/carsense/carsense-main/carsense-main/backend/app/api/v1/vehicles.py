# backend/app/api/v1/vehicles.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.session import get_db
from app.db.models import Vehicle, User
from app.api.deps import get_current_user  # <- exige token y devuelve el usuario actual
from app.schemas import VehicleCreate, VehicleOut  # ajusta si tus esquemas están en otra ruta

router = APIRouter(tags=["vehicles"])

# --------- Helpers ---------
def get_owned_vehicle_or_404(db: Session, user_id: int, vid: int) -> Vehicle:
    v = db.execute(
        select(Vehicle).where(Vehicle.id == vid, Vehicle.owner_id == user_id)
    ).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return v

# --------- Endpoints ---------

@router.get("/vehicles", response_model=List[VehicleOut])
def list_vehicles(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = db.execute(
        select(Vehicle)
        .where(Vehicle.owner_id == user.id)
        .order_by(desc(Vehicle.id))
    ).scalars().all()
    return rows

@router.post("/vehicles", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    payload: VehicleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    v = Vehicle(
        make=payload.make,
        model=payload.model,
        year=payload.year,
        odometer_km=payload.odometer_km or 0,
        owner_id=user.id,  # <- clave: asignar dueño
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v

@router.get("/vehicles/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_owned_vehicle_or_404(db, user.id, vehicle_id)

@router.delete("/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    v = get_owned_vehicle_or_404(db, user.id, vehicle_id)
    db.delete(v)
    db.commit()
    # 204 → sin body
