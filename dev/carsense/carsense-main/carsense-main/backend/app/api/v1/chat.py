# backend/app/api/v1/chat.py
from fastapi import APIRouter
from pydantic import BaseModel
import re
from typing import List, Dict, Optional

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

# --------- Utilidades simples ----------
def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())

def has_any(text: str, *needles: str) -> bool:
    t = norm(text)
    return any(n in t for n in needles)

# --------- Base de conocimiento breve ----------
FAQ: Dict[str, Dict] = {
    "cambio_aceite": {
        "q": ["cuando cambio aceite", "cambio de aceite", "cada cuantos km aceite", "aceite cada"],
        "a": (
            "Como regla general: **cada 8–12 mil km o 6–12 meses** (lo que ocurra primero). "
            "Respeta la viscosidad del manual (p. ej. 5W-30) y **cambia el filtro siempre**. "
            "Si haces muchos trayectos cortos, adelántalo."
        ),
        "links": [{"label": "Guía IMCO (PDF)", "href": "/docs/imco_costos_siniestros_2018.pdf"}],
        "suggest": ["Checklist de cambio de aceite", "Recordar en 6 meses"]
    },
    "rotacion_llantas": {
        "q": ["rotacion", "rotación", "llantas", "neumaticos"],
        "a": (
            "La **rotación de llantas** ayuda a un desgaste parejo. "
            "Hazla **cada 10,000 km** aprox. y verifica presión en frío cada 2 semanas."
        ),
        "suggest": ["Cómo medir presión", "Próximo servicio sugerido"]
    },
    "frenos": {
        "q": ["frenos", "balatas", "pastillas"],
        "a": (
            "Revisa frenos si oyes chirrido/metal, pedal esponjoso o el auto se va de lado. "
            "Cambio típico de **pastillas: 25–40 mil km**, pero depende del uso."
        ),
        "suggest": ["Agendar revisión de frenos"]
    },
    "documentos_jalisco": {
        "q": ["reglamento", "jalisco", "sanciones", "velocidades"],
        "a": (
            "El **Reglamento de Movilidad (Jalisco)** define prioridad peatonal, límites y sanciones. "
            "Útil para entender obligaciones y dispositivos de control."
        ),
        "links": [{"label": "Reglamento Jalisco (PDF)", "href": "/docs/reglamento_jalisco.pdf"}]
    },
    "estrategia_nacional": {
        "q": ["estrategia nacional", "oms", "onu", "seguridad vial"],
        "a": (
            "La **Estrategia Nacional de Seguridad Vial** alinea metas 2030: velocidad segura, "
            "vías que perdonan el error, usuarios protegidos y datos confiables."
        ),
        "links": [{"label": "Estrategia Nacional (PDF)", "href": "/docs/estrategia_nacional_seguridad_vial.pdf"}]
    },
}

OBD_DICT = {
    "p0300": "Misfire aleatorio/múltiple. Revisa bujías, bobinas, fugas de vacío.",
    "p0171": "Mezcla pobre (Banco 1). Posibles fugas de vacío o MAF sucio.",
    "p0420": "Eficiencia del catalizador baja. Ver sensor O2/catalizador/fugas escape.",
    "p0113": "IAT señal alta. Sensor de temperatura de aire o conexión.",
}

# --------- Modelos ----------
class ChatIn(BaseModel):
    message: str
    # opcionalmente podrías enviar {vehicle:{anio:int, km:int}} para hacer respuestas más específicas
    vehicle_km: Optional[int] = None
    vehicle_year: Optional[int] = None

class ChatOut(BaseModel):
    reply: str
    suggestions: List[str] = []
    links: List[Dict[str, str]] = []

# --------- Motor muy simple ----------
def intent_reply(data: ChatIn) -> ChatOut:
    msg = norm(data.message)

    # 0) Saludos / ayuda
    if has_any(msg, "hola", "buenas", "que onda", "ayuda", "cómo usar"):
        return ChatOut(
            reply=(
                "¡Hola! Soy el asistente de CarSense. Puedo ayudarte con **mantenimiento**, "
                "**códigos OBD** (ej. *P0420*), **recomendaciones por km/año** y abrir **PDFs** útiles.\n\n"
                "Escribe algo como: *\"tengo 120000 km, ¿qué hago?\"* o *\"P0171\"*."
            ),
            suggestions=[
                "¿Cuándo cambio el aceite?",
                "Tengo P0420",
                "Recomiéndame mantenimiento con 150000 km",
            ],
        )

    # 1) Códigos OBD (p0xxx)
    m = re.search(r"\b(p0\d{3})\b", msg)
    if m:
        code = m.group(1)
        desc = OBD_DICT.get(code, "Código OBD-II reconocido, pero no está en mi lista corta. Revisa con un escáner y manual de servicio.")
        return ChatOut(
            reply=f"**{code.upper()}**: {desc}\n\nTip: guarda la lectura antes de borrar códigos.",
            suggestions=["Ver OBD-II básico", "Cómo borrar DTC con cuidado"],
            links=[{"label": "Estrategia Nacional (PDF)", "href": "/docs/estrategia_nacional_seguridad_vial.pdf"}],
        )

    # 2) Preguntas de km/año
    km_match = re.search(r"(\d{5,6})\s*km", msg) or re.search(r"(\d{2,3})\s*mil\s*km", msg)
    if km_match:
        raw = km_match.group(1).replace(" ", "")
        kms = int(raw) if "mil" not in msg else int(raw) * 1000
        blocks = []
        if kms >= 150_000:
            blocks.append("• Revisar **correa/cadena** según tu motor.")
        if kms >= 100_000:
            blocks.append("• **Bujías** y limpieza de cuerpo de aceleración (si procede).")
        if kms >= 80_000:
            blocks.append("• **Líquido de frenos** (cada 2 años) y **refrigerante**.")
        blocks.append("• **Aceite + filtro** cada 8–12 mil km o 6–12 meses.")
        blocks.append("• **Rotación de llantas** cada ~10 mil km y presión cada 2 semanas.")
        reply = f"Tienes **{kms:,} km**. Te sugiero:\n" + "\n".join(blocks)
        return ChatOut(
            reply=reply,
            suggestions=["Agendar cambio de aceite", "Crear recordatorio de rotación"],
        )

    year_m = re.search(r"\b(19|20)\d{2}\b", msg)
    if year_m:
        year = int(year_m.group(0))
        extras = []
        if year <= 2005:
            extras.append("• Revisa mangueras y plásticos envejecidos (fragilidad).")
        if year <= 2010:
            extras.append("• Considera actualizar faros/limpias por seguridad.")
        base = (
            f"Modelo **{year}**. Además del plan por km, cuida:\n"
            "• Gomas de motor/suspensión, refrigerante vigente, llantas con DOT no vencido.\n"
        )
        if extras:
            base += "\n".join(extras)
        return ChatOut(
            reply=base,
            suggestions=["Checklist de viaje", "Programar inspección general"]
        )

    # 3) FAQ por similitud
    for key, item in FAQ.items():
        if any(kw in msg for kw in item["q"]):
            return ChatOut(reply=item["a"], suggestions=item.get("suggest", []), links=item.get("links", []))

    # 4) fallback
    return ChatOut(
        reply=(
            "No estoy seguro, pero puedo ayudarte con **aceite**, **rotación**, **frenos**, "
            "**códigos OBD (P0xxx)** o abrir **PDFs** de referencia. "
            "Prueba: *\"tengo 120000 km\"*, *\"P0300\"*, *\"reglamento jalisco\"*."
        ),
        suggestions=["¿Cuándo cambio el aceite?", "Tengo P0171", "Abrir Reglamento de Jalisco"],
        links=[{"label": "Reglamento Jalisco (PDF)", "href": "/docs/reglamento_jalisco.pdf"}]
    )

@router.post("", response_model=ChatOut)
def chat(data: ChatIn):
    return intent_reply(data)
