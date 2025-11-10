from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import Service

DEFAULT_SERVICES = [
    {"tipo": "aceite", "intervalo_km": 10000, "intervalo_meses": 6, "descripcion": "Cambio de aceite y filtro."},
    {"tipo": "freno", "intervalo_km": 20000, "intervalo_meses": 12, "descripcion": "Revisión de balatas y discos."},
    {"tipo": "filtro_aire", "intervalo_km": 15000, "intervalo_meses": 12, "descripcion": "Reemplazo filtro de aire."},
    {"tipo": "rotacion_llantas", "intervalo_km": 10000, "intervalo_meses": 6, "descripcion": "Rotación de llantas."},
]

def run():
    db: Session = SessionLocal()
    try:
        for s in DEFAULT_SERVICES:
            exists = db.query(Service).filter(Service.tipo == s["tipo"]).first()
            if not exists:
                db.add(Service(**s))
        db.commit()
        print("Seed services OK")
    finally:
        db.close()

if __name__ == "__main__":
    run()
