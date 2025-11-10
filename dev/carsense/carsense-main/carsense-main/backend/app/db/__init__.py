# app/db/__init__.py
from .base import Base
from .session import engine, SessionLocal

def ensure_db():
    # Crea las tablas si no existen
    Base.metadata.create_all(bind=engine)

__all__ = ["Base", "engine", "SessionLocal", "ensure_db"]
