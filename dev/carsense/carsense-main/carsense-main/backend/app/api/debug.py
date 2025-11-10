# app/api/debug.py
from fastapi import APIRouter
from app.db import ensure_db, Base, engine

router = APIRouter(prefix="/__debug__", tags=["__debug__"])

@router.get("/health")
def health():
    return {"ok": True}

@router.get("/ensure-db")
def ensure_db_route():
    ensure_db()
    return {"status": "ok", "tables": list(Base.metadata.tables.keys())}

@router.get("/tables")
def list_tables():
    return {"tables": list(Base.metadata.tables.keys())}
