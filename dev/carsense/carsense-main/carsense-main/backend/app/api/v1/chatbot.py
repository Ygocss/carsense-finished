# backend/app/api/v1/chatbot.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, List, Tuple, Optional
import re, random

router = APIRouter()

# ===================== Modelos =====================
class Message(BaseModel):
    role: str
    content: str

class AskReq(BaseModel):
    messages: List[Message]

class AskRes(BaseModel):
    text: str
    followups: Optional[List[str]] = None
    intent: Optional[str] = None

# ===================== Base DTC =====================
DTC_MAP: Dict[str, str] = {
    "P0171": "Mezcla pobre (Bank 1). Revisa tomas de aire falsas, MAF sucio, presion de combustible y fugas de vacio.",
    "P0420": "Eficiencia del catalizador por debajo del umbral. Revisa fugas en escape, sensores O2 y estado del catalizador.",
    "P0300": "Fallo de encendido aleatorio. Revisa bujias, bobinas, cables, inyectores y compresion.",
    "P0442": "Fuga pequena en sistema EVAP. Revisa tapa de combustible, mangueras EVAP y valvula de purga.",
    "P0128": "Temperatura de refrigerante baja. Termostato abierto o sensor ECT defectuoso.",
}

# ===================== Deteccion de intencion =====================
def detect_intent(text: str) -> Tuple[str, Dict[str, str]]:
    t = (text or "").lower().strip()

    # DTC
    m = re.search(r"\b([pbcu]\d{4})\b", t, flags=re.I)
    if m:
        return "dtc", {"code": m.group(1).upper()}

    # Temas
    if any(k in t for k in ["aceite", "oil"]):
        return "oil", {}
    if any(k in t for k in ["llanta", "neumat", "presion", "presión", "psi"]):
        return "tires", {}
    if ("freno" in t) or ("vibra al frenar" in t) or ("vibra al freno" in t) or ("rechinan" in t):
        return "brakes", {}
    if "bater" in t:
        return "battery", {}
    if any(k in t for k in ["obd", "scanner", "escáner", "escaner", "codigo", "código", "check engine"]):
        return "obd", {}
    if any(k in t for k in ["refrigerante", "coolant", "anticong", "sobrecalienta", "temperatura alta"]):
        return "coolant", {}
    if any(k in t for k in ["se calienta", "en trafico", "en tráfico", "/clima"]):
        return "overheat", {}
    if any(k in t for k in ["bujia", "bujía", "spark"]):
        return "plugs", {}
    if any(k in t for k in ["filtro de aire", "filtro cabina", "cabina"]):
        return "filters", {}
    if "consumo" in t or "ahorro" in t or "rendimiento" in t or "/consumo" in t:
        return "economy", {}
    if any(k in t for k in ["liquidos", "líquidos", "/liquidos", "nivel de liquido", "fluidos"]):
        return "fluids", {}
    if any(k in t for k in ["suspension", "suspensión", "/suspension", "golpeteo", "ruido suspension", "amortiguador"]):
        return "suspension", {}
    if any(k in t for k in ["luces", "/luces", "faro", "faros", "bombilla", "cuartos", "alta y baja"]):
        return "lights", {}
    if any(k in t for k in ["huele a gasolina", "olor a gasolina", "fuga de gasolina", "olor combustible"]):
        return "fuel", {}
    if any(k in t for k in ["que revisar primero", "¿que revisar primero", "qué revisar primero", "/primero"]):
        return "firstcheck", {}
    if any(k in t for k in ["mantenimiento", "servicio", "proximo", "próximo", "cuando toca"]):
        return "schedule", {}
    return "general", {}

# ===================== Sugerencias =====================
SUGGESTIONS: Dict[str, List[str]] = {
    "general": [
        "¿Cada cuanto cambio el aceite?",
        "¿Que presion llevan mis llantas?",
        "Mi coche marca P0171",
        "Mis frenos rechinan",
        "Mi bateria ya no dura",
        "¿Como conecto un escaner OBD-II?",
        "Voy a viajar, ¿que reviso?",
        "¿Cuando toca mi proximo servicio?",
    ],
    "oil": ["¿Que viscosidad usa mi auto?", "¿Cambio filtro siempre?", "¿Mineral o sintetico?"],
    "tires": ["¿Cuanta presion (psi) llevan?", "¿Cuando rotar llantas?", "¿Alineacion o balanceo?"],
    "brakes": ["Mis frenos rechinan", "¿Por que vibra al frenar?", "¿Cada cuando cambiar el liquido?"],
    "battery": ["¿Como probar la bateria con multimetro?", "¿Voltaje del alternador?", "¿Consumo parasito?"],
    "obd": ["¿Como enlazo un lector Bluetooth?", "¿Que es freeze-frame?", "¿Puedo borrar codigos?"],
    "coolant": ["¿Cada cuando cambiar refrigerante?", "¿Puedo mezclar colores?", "¿Que temperatura es normal?"],
    "overheat": ["¿Por que sube la temperatura en trafico?", "¿Como probar ventiladores?", "¿Puedo seguir conduciendo?"],
    "plugs": ["¿Cada cuando cambiar bujias?", "Sintomas de bujias gastadas", "Torque correcto"],
    "filters": ["¿Cuando cambiar filtro de aire?", "¿Para que sirve el de cabina?"],
    "economy": ["Tips para mejorar consumo", "¿Presion afecta consumo?", "¿Regular o premium?"],
    "schedule": ["¿Que toca a los 10,000 km?", "¿Y a los 40,000 km?", "¿Como registrar mi servicio?"],
    "dtc": ["¿Que muestra el freeze-frame?", "¿Borrar y ver si vuelve?", "¿Como probar fugas de vacio?"],
    "fluids": ["¿Como revisar niveles?", "¿Liquido de frenos cada cuanto?", "¿Cuando cambiar refrigerante?"],
    "suspension": ["Golpeteo en baches", "¿Cuando cambiar amortiguadores?", "¿Balanceo o alineacion?"],
    "lights": ["Faros opacos, ¿que hago?", "¿Como alinear faros?", "¿LED o halogena?"],
    "fuel": ["¿Es peligroso el olor a gasolina?", "¿Puede ser EVAP?", "¿Como revisar mangueras?"],
    "firstcheck": ["Revisar niveles y fugas", "Estado de llantas y frenos", "Prueba rapida de bateria"],
}

def pick_followups(intent: str, code: Optional[str] = None) -> List[str]:
    base = SUGGESTIONS.get(intent, SUGGESTIONS["general"]).copy()
    if intent == "dtc" and code:
        base.insert(0, f"Tengo el codigo {code}, ¿que reviso primero?")
    random.shuffle(base)
    out, seen = [], set()
    for s in base:
        if s not in seen:
            out.append(s); seen.add(s)
        if len(out) >= 6: break
    return out

# ===================== Respuestas =====================
def answer_dtc(code: str) -> str:
    base = DTC_MAP.get(code, f"Codigo {code}. Verifica sensores/arnes relacionados y datos en vivo.")
    return (
        f"Diagnostico rapido — {code}\n"
        f"{base}\n\n"
        "Acciones: 1) No borres el codigo aun; guarda freeze-frame. 2) Revisa mangueras/tapas y conectores. "
        "3) Mira STFT/LTFT y O2/ECT segun aplique.\n"
        "Riesgo: luz parpadeando = no conducir."
    )

def answer_oil() -> str:
    return ("Aceite: intervalo 8–12 mil km o 6–12 meses. Viscosidad y especificacion OEM. "
            "Cambiar filtro siempre y revisar fugas en tapon/carter/filtro.")

def answer_tires() -> str:
    return ("Llantas: presion en frio 32–35 psi (confirma etiqueta). Rotacion 10–12 mil km. "
            "Desgaste irregular sugiere alineacion/balanceo; revisa fecha (DOT) y daños.")

def answer_brakes() -> str:
    return ("Frenos: rechinido por pastillas cristalizadas o polvo; vibracion por discos alabeados. "
            "Inspecciona espesor, limpia guias y cambia/rectifica segun tolerancia. Liquido cada 24 meses.")

def answer_battery() -> str:
    return ("Bateria: reposo ~12.6 V, arranque >9.6 V, carga 13.8–14.4 V. Limpia terminales y revisa masas. "
            "Si se descarga parada, busca consumo parasito.")

def answer_obd() -> str:
    return ("OBD-II: conecta lector Bluetooth, lee codigos y freeze-frame, revisa datos en vivo. "
            "No borres codigos sin investigar la causa.")

def answer_coolant() -> str:
    return ("Refrigerante: intervalo 3–5 anios. No mezclar tipos sin confirmar. "
            "Purgado tras cambio para evitar bolsas de aire. Temperatura normal ~90 C.")

def answer_overheat() -> str:
    return ("Se calienta en trafico: comprueba ventiladores (deben encender con A/C), fusibles/relevadores, "
            "nivel y tapa de radiador, fugas y purgado. Si llega a zona roja, detente y apaga.")

def answer_plugs() -> str:
    return ("Bujias: 40–60 mil km (iridium hasta ~100k). Sintomas: tirones, ralenti inestable, consumo alto. "
            "Usa torque especificado por fabricante.")

def answer_filters() -> str:
    return ("Filtros: aire 12–15 mil km (antes si hay polvo); cabina anual o 15k km. "
            "Aire sucio aumenta consumo y reduce potencia.")

def answer_economy() -> str:
    return ("Consumo: presion correcta de llantas, conduccion suave, filtros limpios y aceite adecuado. "
            "Evita peso extra y ralenti prolongado. Usa gasolina recomendada por el fabricante.")

def answer_schedule() -> str:
    return ("Calendario: 10–12k aceite/filtro; 20–25k rotacion e inspeccion de frenos; "
            "40k liquido de frenos; 60k bujias (segun tipo). Ajusta por uso severo.")

def answer_fluids() -> str:
    return ("Liquidos: aceite (varilla), frenos (entre MIN y MAX), refrigerante (deposito en frio), "
            "direccion/ATF si aplica y lavaparabrisas. Cambia liquido de frenos cada ~24 meses y revisa fugas.")

def answer_suspension() -> str:
    return ("Suspension: golpeteo en baches suele ser bujes/terminales; rebote excesivo indica amortiguadores. "
            "Vibracion en carretera sugiere balanceo; tironeo, alineacion. Revisa holguras y estado de llantas.")

def answer_lights() -> str:
    return ("Luces: revisa fusibles, bombillas y tierra. Faros opacos: pulido o cambio de mica. "
            "Alinea faros en pared plana a 5–7 m. Cambia en pares y respeta potencia OEM.")

def answer_fuel() -> str:
    return ("Olor a gasolina: inspecciona mangueras, riel e inyectores; tapa del tanque y sistema EVAP. "
            "Si el olor es fuerte dentro del auto, ventila y evita chispas; repara antes de trayectos largos.")

def answer_firstcheck() -> str:
    return ("Que revisar primero: niveles (aceite, frenos, refrigerante), llantas y presion, frenos a simple vista, "
            "bateria (terminales y voltaje), fugas bajo el auto y todas las luces. Con eso descartas lo basico rapido.")

def answer_general() -> str:
    closers = ["Si quieres, te doy un checklist.", "¿Agendamos un recordatorio por fecha o km?", "Puedo darte pasos concretos ahora."]
    return "Puedo ayudarte con mantenimiento, OBD-II y seguridad. Dime el sintoma o el codigo y te doy pasos accionables. " + random.choice(closers)

def build_answer(intent: str, text: str, ctx: Dict[str, str]) -> str:
    return {
        "dtc": lambda: answer_dtc(ctx.get("code","DTC")),
        "oil": answer_oil,
        "tires": answer_tires,
        "brakes": answer_brakes,
        "battery": answer_battery,
        "obd": answer_obd,
        "coolant": answer_coolant,
        "overheat": answer_overheat,
        "plugs": answer_plugs,
        "filters": answer_filters,
        "economy": answer_economy,
        "schedule": answer_schedule,
        "fluids": answer_fluids,
        "suspension": answer_suspension,
        "lights": answer_lights,
        "fuel": answer_fuel,
        "firstcheck": answer_firstcheck,
        "general": answer_general,
    }.get(intent, answer_general)()

# ===================== Endpoint =====================
@router.post("/chatbot/ask", response_model=AskRes)
def chatbot_ask(req: AskReq) -> AskRes:
    last = ""
    for m in reversed(req.messages or []):
        if m.role == "user":
            last = (m.content or "").strip()
            break
    intent, ctx = detect_intent(last)
    text = build_answer(intent, last, ctx)
    followups = pick_followups(intent, ctx.get("code"))
    return AskRes(text=text, followups=followups, intent=intent)
