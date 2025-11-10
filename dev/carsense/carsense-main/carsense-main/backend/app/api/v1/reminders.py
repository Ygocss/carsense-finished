# backend/app/api/v1/reminders.py
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.session import get_db
from app.db import models
from app.api.deps import get_current_user  # ← requiere JWT y devuelve el usuario actual
from app.schemas.reminders import ReminderCreate, ReminderOut

router = APIRouter(tags=["reminders"])


# ---------- Helper: validar que el vehículo sea del usuario ----------
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
@router.get("/reminders", response_model=List[ReminderOut])
def list_reminders(
    vehicle_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    if vehicle_id is not None:
        # valida que el vehículo sea del usuario y filtra por vehicle_id
        assert_vehicle_ownership(db, user.id, vehicle_id)
        rows = db.execute(
            select(models.Reminder)
            .where(models.Reminder.vehicle_id == vehicle_id)
            .order_by(desc(models.Reminder.id))
        ).scalars().all()
        return rows

    # sin vehicle_id: une con Vehicle y filtra por owner_id
    rows = db.execute(
        select(models.Reminder)
        .join(models.Vehicle, models.Vehicle.id == models.Reminder.vehicle_id)
        .where(models.Vehicle.owner_id == user.id)
        .order_by(desc(models.Reminder.id))
    ).scalars().all()
    return rows


# ---------- CREAR ----------
@router.post("/reminders", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
def create_reminder(
    payload: ReminderCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    # valida propiedad del vehículo
    assert_vehicle_ownership(db, user.id, payload.vehicle_id)

    # validaciones de campos según tipo
    if payload.kind == "date" and not payload.due_date:
        raise HTTPException(status_code=400, detail="due_date requerido para kind=date")
    if payload.kind == "odometer" and payload.due_km is None:
        raise HTTPException(status_code=400, detail="due_km requerido para kind=odometer")

    r = models.Reminder(
        vehicle_id=payload.vehicle_id,
        kind=payload.kind,
        due_date=payload.due_date,
        due_km=payload.due_km,
        notes=payload.notes,
        done=False,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


# ---------- TOGGLE DONE ----------
@router.patch("/reminders/{reminder_id}", response_model=ReminderOut)
def toggle_done(
    reminder_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    r = db.execute(
        select(models.Reminder).where(models.Reminder.id == reminder_id)
    ).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado")

    # valida propiedad del vehículo asociado
    assert_vehicle_ownership(db, user.id, r.vehicle_id)

    r.done = not bool(r.done)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


# ---------- ELIMINAR ----------
@router.delete("/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    r = db.execute(
        select(models.Reminder).where(models.Reminder.id == reminder_id)
    ).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado")

    # valida propiedad del vehículo asociado
    assert_vehicle_ownership(db, user.id, r.vehicle_id)

    db.delete(r)
    db.commit()
    # 204 → sin body
