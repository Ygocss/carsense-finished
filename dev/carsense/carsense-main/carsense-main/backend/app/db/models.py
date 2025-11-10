# app/db/models.py
from datetime import date

from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.base import Base


# =================== Usuarios ===================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    # Un usuario tiene muchos vehículos
    vehicles = relationship(
        "Vehicle",
        back_populates="owner",
        cascade="all, delete-orphan",
    )


# =================== Vehículos ===================
class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    make = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    year = Column(Integer, nullable=True)
    odometer_km = Column(Integer, default=0, nullable=True)

    # Dueño del vehículo (nuevo)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    owner = relationship("User", back_populates="vehicles")

    # Relaciones existentes
    services = relationship(
        "ServiceRecord",
        back_populates="vehicle",
        cascade="all, delete-orphan",
    )
    # (opcional) si quieres navegar a recordatorios desde vehículo:
    # reminders = relationship("Reminder", back_populates="vehicle", cascade="all, delete-orphan")


# ============== Servicios (historial) ==============
class ServiceRecord(Base):
    __tablename__ = "service_records"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    service_type = Column(String(100), nullable=False)
    date = Column(Date, nullable=True)  # ISO yyyy-mm-dd
    km = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    vehicle = relationship("Vehicle", back_populates="services")


# ================== Recordatorios ==================
class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        index=True,
    )
    kind: Mapped[str] = mapped_column(String(16))  # "date" | "odometer"

    # Usar tipo Python en la anotación y SQLAlchemy en la columna
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_km: Mapped[int | None] = mapped_column(Integer, nullable=True)

    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False)

    # (opcional) si activas relación inversa en Vehicle:
    # vehicle = relationship("Vehicle", back_populates="reminders")
