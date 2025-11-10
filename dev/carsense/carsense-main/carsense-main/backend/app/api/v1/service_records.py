# backend/app/api/v1/service_records.py
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.session import get_db
from app.db import models
from app.api.deps import get_current_user   # <- exige JWT y devuelve el usuario actual
from app.schemas.service_records import ServiceOut, ServiceCreate  # ajusta si tu paquete es distinto

router = APIRouter(tags=["services"])


# ---------- Helper: validar propiedad del vehículo ----------
def assert_vehicle_ownership(db: Session, user_id: int, vehicle_id: int) -> None:
    ok = db.execute(
        select(models.Vehicle).where(
            models.Vehicle.id == vehicle_id,
            models.Vehicle.owner_id == user_id,
        )
    ).scalar_one_or_none()
    if not ok:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")


# ---------- LISTAR ----------
@router.get("/services", response_model=List[ServiceOut])
@router.get("/service-records", response_model=List[ServiceOut])
def list_service_records(
    vehicle_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    if vehicle_id is not None:
        # valida propiedad y filtra por vehicle_id
        assert_vehicle_ownership(db, user.id, vehicle_id)
        rows = db.execute(
            select(models.ServiceRecord)
            .where(models.ServiceRecord.vehicle_id == vehicle_id)
            .order_by(desc(models.ServiceRecord.id))
        ).scalars().all()
        return rows

    # sin vehicle_id: une con Vehicle y filtra por dueño
    rows = db.execute(
        select(models.ServiceRecord)
        .join(models.Vehicle, models.Vehicle.id == models.ServiceRecord.vehicle_id)
        .where(models.Vehicle.owner_id == user.id)
        .order_by(desc(models.ServiceRecord.id))
    ).scalars().all()
    return rows


# ---------- CREAR ----------
@router.post("/services", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
@router.post("/service-records", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
def create_service_record(
    payload: ServiceCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    # Verifica que el vehicle_id pertenezca al usuario
    assert_vehicle_ownership(db, user.id, payload.vehicle_id)

    rec = models.ServiceRecord(
        vehicle_id=payload.vehicle_id,
        service_type=payload.service_type,
        date=payload.date,
        km=payload.km,
        notes=payload.notes,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


# ---------- DETALLE (propiedad) ----------
@router.get("/services/{service_id}", response_model=ServiceOut)
@router.get("/service-records/{service_id}", response_model=ServiceOut)
def get_service_record(
    service_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    rec = db.execute(
        select(models.ServiceRecord).where(models.ServiceRecord.id == service_id)
    ).scalar_one_or_none()
    if rec is None:
        raise HTTPException(status_code=404, detail="Service not found")

    # valida propiedad del vehículo asociado
    assert_vehicle_ownership(db, user.id, rec.vehicle_id)
    return rec


# ---------- BORRAR (propiedad) ----------
@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/service-records/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service_record(
    service_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    rec = db.execute(
        select(models.ServiceRecord).where(models.ServiceRecord.id == service_id)
    ).scalar_one_or_none()
    if rec is None:
        raise HTTPException(status_code=404, detail="Service not found")

    # valida propiedad del vehículo asociado
    assert_vehicle_ownership(db, user.id, rec.vehicle_id)

    db.delete(rec)
    db.commit()
    # 204 → sin body
