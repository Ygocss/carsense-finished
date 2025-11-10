# backend/app/api/v1/alerts.py
from datetime import date
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_db, get_current_user
from app.db.models import Alert, Vehicle, User

router = APIRouter(prefix="/alerts", tags=["alerts"])

# Reglas simplificadas (puedes ignorarlas aquí; el cálculo real lo tendrás en tu servicio)
SERVICE_RULES = {
    "aceite": {"km_interval": 10000, "months_interval": 6},
    "freno": {"km_interval": 20000, "months_interval": 12},
    "filtro_aire": {"km_interval": 15000, "months_interval": 12},
    "rotacion_llantas": {"km_interval": 10000, "months_interval": 6},
}

@router.get("/", response_model=List[Dict[str, Any]])
def list_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Alert)
        .join(Vehicle, Alert.vehicle_id == Vehicle.id)
        .filter(Vehicle.user_id == current_user.id)
        .order_by(Alert.created_at.desc())
    )
    rows = q.all()
    return [
        {
            "id": a.id,
            "vehicle_id": a.vehicle_id,
            "servicio": a.servicio,
            "fecha_programada": a.fecha_programada.isoformat() if a.fecha_programada else None,
            "estado": a.estado,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in rows
    ]


@router.post("/run-now", response_model=dict)
def run_now(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Genera/actualiza alertas pendientes (demo: crea una alerta por servicio si no existe).
    """
    vehicles = db.query(Vehicle).filter(Vehicle.user_id == current_user.id).all()
    today = date.today()
    created_or_updated = False

    for v in vehicles:
        for servicio in SERVICE_RULES.keys():
            exists = (
                db.query(Alert)
                .filter(
                    Alert.vehicle_id == v.id,
                    Alert.servicio == servicio,
                    Alert.estado == "pendiente",
                )
                .first()
            )
            if not exists:
                a = Alert(
                    vehicle_id=v.id,
                    servicio=servicio,
                    fecha_programada=today,
                    estado="pendiente",
                )
                db.add(a)
                created_or_updated = True

    if created_or_updated:
        db.commit()

    return {"status": "ok", "alerts_created_or_updated": created_or_updated}


@router.put("/{alert_id}", response_model=dict)
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marca una alerta como 'hecha' (idempotente).
    """
    a = (
        db.query(Alert)
        .join(Vehicle, Alert.vehicle_id == Vehicle.id)
        .filter(Alert.id == alert_id, Vehicle.user_id == current_user.id)
        .first()
    )
    if not a:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    if a.estado != "hecha":
        a.estado = "hecha"
        db.commit()
        db.refresh(a)

    return {
        "id": a.id,
        "vehicle_id": a.vehicle_id,
        "servicio": a.servicio,
        "fecha_programada": a.fecha_programada.isoformat() if a.fecha_programada else None,
        "estado": a.estado,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }

