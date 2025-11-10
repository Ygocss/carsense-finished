// frontend/src/api/chatbot.ts
import axios from "axios";

/** Mensajes estilo ChatML */
export type ChatRole = "system" | "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

/** Respuesta enriquecida: texto + followups tipo árbol de decisión */
export type ChatbotReply = { text: string; followups?: string[] };

// --------- Base URL robusta (igual que en tu client.js) ----------
const raw = import.meta.env.VITE_API_URL;
const cleaned = (raw && raw.replace(/\/+$/, "")) || "http://127.0.0.1:8000";
const baseURL = cleaned.replace(/\/api\/v1$/i, "");
const http = axios.create({ baseURL, timeout: 10000 });

// Utilidad
const today = () => new Date().toISOString().slice(0, 10);

// Normalizador
const N = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

// Reconocimiento simple de P-codes y temas
const isPCode = (s: string) => /\bP0\d{3}\b/i.test(s);
const pickPCode = (s: string) => (s.match(/\bP0\d{3}\b/i)?.[0] ?? "").toUpperCase();

// ----------------- Conocimiento local (fallback) ------------------
type Rule = {
  intent: string;
  tests: RegExp[];
  answer: (q: string) => string;
  followups: (q: string) => string[];
};

// Fuentes (se citan en la UI fuera del código; aquí solo sustentamos el contenido)
const LINKS = {
  // presión llantas, etiqueta/placard (NHTSA TireWise)
  tirewise:
    "https://www.nhtsa.gov/equipment/tires",
  // OBD monitors / readiness (EPA)
  epa_obd:
    "https://www.epa.gov/system/files/documents/2022-08/diesel-obd-im-readiness-14k-pounds-gwr-best-practices.pdf",
  // P0420 y P0171 (KBB como ficha clara para usuario)
  kbb_p0420: "https://www.kbb.com/car-advice/dtc/p0420/",
  kbb_p0171: "https://www.kbb.com/car-advice/dtc/p0171/",
  // Baterías 12V valores típicos (Clarios/AutoBatteries)
  soc_voltage:
    "https://www.autobatteries.com/en-us/battery-knowledge/when-replace-car-battery",
  // AAA: Líquido de frenos / mantenimiento básico
  aaa_frenos:
    "https://magazine.northeast.aaa.com/daily/life/cars-trucks/auto-maintenance/how-often-should-you-change-brake-fluid/",
  aaa_mantto:
    "https://www.consumerreports.org/cars/car-repair-maintenance/the-only-car-maintenance-guide-youll-ever-need-a9540143243/",
};

// Bloques de respuesta por temas
const RULES: Rule[] = [
  // Aceite: intervalo y por qué
  {
    intent: "oil_interval",
    tests: [/aceite|cambio de aceite|cada cu[aá]nto.*aceite|oil/i],
    answer: () =>
      [
        "En autos modernos el intervalo típico es **7,500–10,000 mi (12–16 mil km) o 12 meses**, pero **manda el manual** y el recordatorio del auto.",
        "Uso severo (urbano, trayectos cortos, calor, carga) acorta el intervalo. Cambia **filtro de aceite en cada servicio**.",
        "Usa la viscosidad y especificación del fabricante (p. ej. 5W-30 API/ILSAC/ACEA indicadas).",
      ].join("\n\n"),
    followups: () => [
      "¿Qué viscosidad lleva mi motor?",
      "¿Señales de aceite viejo?",
      "¿Cómo reinicio el recordatorio de servicio?",
      "¿Qué pasa si mezclo aceites?",
      "Checklist después del cambio",
    ],
  },

  // Presión de llantas
  {
    intent: "tire_pressure",
    tests: [/presi[óo]n.*llantas|psi|bar.*llantas|neum[aá]ticos/i],
    answer: () =>
      [
        "La **presión correcta está en el ‘placard’** (etiqueta) del marco de la puerta del conductor o el manual, **no** en el costado de la llanta.",
        "Mide en **frío**; usa un manómetro confiable. Conduce con presión baja = más desgaste/calor; alta = menor agarre/centro gastado.",
      ].join("\n\n"),
    followups: () => [
      "¿Cómo encuentro el placard?",
      "¿Cada cuánto reviso la presión?",
      "¿Qué TPMS tengo (directo/indirecto)?",
      "¿Cómo rota llantas (patrón)?",
      "Profundidad mínima de dibujo",
    ],
  },

  // Frenos
  {
    intent: "brakes",
    tests: [/fren[oa]s|chirr[ií]an|pastillas|liquido.*freno|l[ií]quido de frenos/i],
    answer: () =>
      [
        "Si **rechinan**: podría ser polvo, pastillas cristalizadas o testigo ‘squealer’. Revisa grosor de pastillas y condición de discos.",
        "El **líquido de frenos** suele cambiarse **cada ~2 años** (absorbe humedad). Usa el **DOT** especificado y **no mezcles** tipos.",
      ].join("\n\n"),
    followups: () => [
      "¿Cuándo cambiar líquido de frenos?",
      "¿Cómo identificar pastillas gastadas?",
      "¿Vibración al frenar = discos alabeados?",
      "¿Qué DOT lleva mi auto?",
    ],
  },

  // Refrigerante / coolant
  {
    intent: "coolant",
    tests: [/coolant|refrigerante|antifriz|antifreeze/i],
    answer: () =>
      [
        "Respeta **tipo (OAT/HOAT/si-OAT)** y **color NO determina el tipo**. Mezclar tipos puede reducir protección.",
        "Intervalo típico de larga vida: **5 años/150,000 mi** (depende del tipo). Comprueba nivel en frío; nunca abras el tapón caliente.",
      ].join("\n\n"),
    followups: () => [
      "¿Cómo identificar mi tipo de refrigerante?",
      "Síntomas de termostato trabado (P0128)",
      "¿Cuándo cambiar mangueras?",
      "¿Puedo mezclar marcas?",
    ],
  },

  // Batería 12 V
  {
    intent: "battery",
    tests: [/bater[ií]a|no dura|no arranca|arranque en fr[ií]o|voltaje.*12/i],
    answer: () =>
      [
        "Referencias en reposo: **~12.6 V ≈ cargada**, **~12.2 V ≈ 50%**, **≤12.0 V descargada**. Mide tras reposo y sin cargas.",
        "Si hay dudas, prueba con **carga** o en tienda con probador conductancia; revisa bornes y consumo parásito.",
      ].join("\n\n"),
    followups: () => [
      "¿Cómo medir voltaje correctamente?",
      "¿Cuánta vida útil promedio?",
      "¿Qué es consumo parásito?",
      "¿Se puede revivir con cargador?",
    ],
  },

  // OBD-II: preguntas genéricas
  {
    intent: "obd_generic",
    tests: [/obd|dtc|c[oó]digo.*fall[ao]|scanner|esc[aá]ner/i],
    answer: () =>
      [
        "Un DTC es un **código estandarizado**. Hay monitores **continuos** (misfire, combustible) y **no continuos** (catalizador, EVAP…).",
        "Tras borrar códigos, los **monitores** tardan en ponerse ‘LISTOS’; un **catalizador** o **EVAP** pueden requerir varios ciclos.",
      ].join("\n\n"),
    followups: () => [
      "¿Qué es ‘monitor listo’?",
      "¿Cómo hacer un ciclo de manejo?",
      "¿Puedo conducir con el testigo encendido?",
      "¿Cómo leer fuel trims (LTFT/STFT)?",
    ],
  },

  // P0171 (mezcla pobre)
  {
    intent: "p0171",
    tests: [/P0171/i],
    answer: (q) =>
      [
        "**P0171 (mezcla pobre, banco 1)**. Causas comunes: **fugas de vacío**, MAF sucio/defectuoso, presión de combustible baja, escape antes del O2.",
        "Pasos: revisar fugas/abrazaderas, limpiar/verificar **MAF**, presión de bomba/filtro, **fuel trims** con escáner, humo para fugas.",
      ].join("\n\n"),
    followups: () => [
      "¿Cómo leer fuel trims?",
      "¿Cómo limpiar el MAF con seguridad?",
      "¿Dónde buscar fugas de vacío?",
      "¿Puedo conducir con P0171?",
    ],
  },

  // P0420 (eficiencia de catalizador baja)
  {
    intent: "p0420",
    tests: [/P0420/i],
    answer: () =>
      [
        "**P0420** indica **eficiencia baja del catalizador**. Antes de cambiarlo, verifica **fugas de escape**, misfires, mezcla rica/pobre, sensor O2 posterior.",
        "Usa datos del O2 adelante/atrás; revisa que no haya otros DTC de mezcla/ignición. Catalizador se daña por misfire/combustible sin quemar.",
      ].join("\n\n"),
    followups: () => [
      "¿Cómo probar fugas de escape?",
      "¿Qué gráfico del O2 debo ver?",
      "¿Catalizador universal vs OEM?",
      "¿Puedo pasar verificación con P0420?",
    ],
  },

  // P0300 (misfire múltiple) / P030x
  {
    intent: "p030x",
    tests: [/P030\d|P0300/i],
    answer: () =>
      [
        "Misfire: revisa **bujías**, bobinas, cables, fugas vacío, compresión y mezcla. Si es P030X, el número indica el cilindro.",
        "Mira datos de misfire por cilindro si tu escáner lo soporta; revisa humedad/aislamiento en bobinas.",
      ].join("\n\n"),
    followups: () => [
      "¿Cómo leer misfire por cilindro?",
      "¿Cuándo cambiar bujías?",
      "¿Prueba de compresión/‘leak-down’?",
    ],
  },

  // P0442 (EVAP pequeña fuga)
  {
    intent: "p0442",
    tests: [/P0442/i],
    answer: () =>
      [
        "EVAP fuga pequeña: lo más común es **tapa de combustible** mal cerrada o empaque dañado. Revisa mangueras EVAP y válvula purge.",
      ].join("\n\n"),
    followups: () => [
      "¿Cómo probar tapa del tanque?",
      "¿Dónde va la válvula purge/vent?",
      "¿Cómo hacer ‘drive cycle’ para EVAP?",
    ],
  },
];

// Motor local
function localResponder(history: ChatMessage[]): ChatbotReply {
  const q = history.slice().reverse().find((m) => m.role === "user")?.content ?? "";
  const nq = N(q);

  // Si viene P-code, prioriza
  if (isPCode(q)) {
    const code = pickPCode(q);
    const hit = RULES.find((r) => r.tests.some((re) => re.test(code)));
    if (hit) return { text: hit.answer(code), followups: hit.followups(code) };
  }

  // Busqueda por tema
  const hit = RULES.find((r) => r.tests.some((re) => re.test(nq)));
  if (hit) return { text: hit.answer(q), followups: hit.followups(q) };

  // Catch-all
  return {
    text:
      "Puedo ayudarte con **mantenimiento, OBD-II y seguridad**. Prueba: “¿Cada cuánto cambio el aceite?”, “Tengo **P0171**”, “¿Presión correcta de llantas?” o “Mis frenos rechinan”.",
    followups: [
      "¿Cada cuánto cambio el aceite?",
      "Tengo P0171",
      "¿Presión correcta de llantas?",
      "Mis frenos rechinan",
      "Mi batería ya no dura",
    ],
  };
}

// --------------------- API principal ---------------------
export async function askChatbot(messages: ChatMessage[]): Promise<ChatbotReply> {
  // Normaliza: solo role + content (sin "ts" u otros campos)
  const payload = {
    messages: (messages || []).map(m => ({ role: m.role, content: m.content })),
  };

  try {
    const { data } = await http.post("/api/v1/chatbot/ask", payload);

    // Backend tuyo: { text, followups?, intent? }
    if (typeof data?.text === "string") {
      return {
        text: data.text,
        followups: Array.isArray(data.followups) ? data.followups : [],
      };
    }

    // Compat opcional si alguna vez devuelves { reply, ... }
    if (typeof data?.reply === "string") {
      return {
        text: data.reply,
        followups: Array.isArray(data.followups) ? data.followups : [],
      };
    }
  } catch {
    // fall back abajo
  }

  // 2) Fallback local si el backend falla
  return localResponder(messages);
}


// Exponemos los links para que la UI pueda mostrarlos en “Fuentes”
export const SOURCE_LINKS = LINKS;
