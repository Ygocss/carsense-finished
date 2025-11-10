// frontend/src/pages/Chatbot.tsx
// Semanas 1 + 2 + 3: polish + acciones + memoria corta + recordatorios (fecha/km)
// + Mini-NLP offline: crea recordatorios/servicios desde lenguaje natural (sin OpenAI)

import { useEffect, useMemo, useRef, useState } from "react";
import { askChatbot, SOURCE_LINKS } from "../api/chatbot";
import type { ChatMessage } from "../api/chatbot";
import {
  getVehicles, listServices, createService as apiAddService, deleteService,
  listReminders, addReminder, deleteReminder, toggleReminder
} from "../api/client";

// ===== Tipos UI =====
interface UIMsg { role: "system" | "user" | "assistant"; content: string; ts: number }

type Svc = {
  id: number; vehicle_id: number; service_type?: string | null;
  date?: string | null; km?: number | null; notes?: string | null;
};

type Rem = {
  id: number; vehicle_id: number; kind: "date" | "odometer";
  due_date?: string | null; due_km?: number | null; done?: boolean | null; notes?: string | null;
};

// Normalizadores
const toSvc = (r: any): Svc => ({
  id: Number(r.id), vehicle_id: Number(r.vehicle_id),
  service_type: r.service_type ?? null, date: r.date ?? null, km: r.km ?? null, notes: r.notes ?? null,
});
const toRem = (r: any): Rem => ({
  id: Number(r.id), vehicle_id: Number(r.vehicle_id),
  kind: r.kind === "odometer" ? "odometer" : "date",
  due_date: r.due_date ?? null, due_km: r.due_km ?? null, done: !!r.done, notes: r.notes ?? null,
});

// Utiles
const hhmm = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const pad2 = (n: number) => String(n).padStart(2, "0");

// ---- INTENTS comunes -> plantillas de prompt (para respuestas del bot)
const INTENTS: Record<string, (v?: any) => string> = {
  aceite: (v) =>
    `¿Cada cuándo debo cambiar aceite y filtro para ${v ? `${v.make} ${v.model} (${v.year ?? "s/a"})` : "mi auto"}?
Incluye tipo de aceite sugerido y señales de desgaste.`,
  llantas: () => `Presión de llantas y rotación: guía práctica.`,
  frenos: () => `Frenos rechinan o vibran: causas y verificación.`,
  bateria: () => `Batería 12V: síntomas, voltajes y pruebas con multímetro.`,
  viaje: () => `Checklist antes de viaje largo (niveles, llantas, frenos, luces, documentos, kit).`,
  consumo: () => `Consumo alto: diagnóstico por etapas y hábitos eficientes.`,
  obd: () => `Interpreta el código OBD-II recibido, monitores y pruebas caseras.`,
  liquidos: () => `Mapa de fluidos: intervalos y colores.`,
  clima: () => `A/C no enfría: diagnóstico básico y riesgos.`,
  suspension: () => `Golpeteos/inestabilidad: diagnóstico y pruebas de rebote.`,
  luces: () => `Luces de advertencia comunes: significado y prioridad.`,
};

// ====== Mini NLP offline ======
// Parse km (soporta “15000”, “15k”, “15 000”)
function parseKm(q: string): number | null {
  const norm = q.replace(/\s| /g, ""); // quita espacios normales y no-break
  const m1 = norm.match(/(\d{1,3}(?:[.,]?\d{3})+|\d{3,})(?:\s?km)?\b/i); // 12.000 / 12,000 / 12000
  if (m1) return Number(m1[1].replace(/[.,]/g, ""));
  const m2 = q.match(/(\d+(?:[.,]\d+)?)\s?k\b/i); // 15k
  if (m2) return Math.round(parseFloat(m2[1].replace(",", ".")) * 1000);
  return null;
}

// Parse fecha (dd/mm[/aaaa] | aaaa-mm-dd | “hoy” | “mañana” | “en N días/semanas/meses”)
function parseDateMX(q: string): string | null {
  const now = new Date();
  const low = q.toLowerCase();

  if (/\bhoy\b/.test(low)) {
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  }
  if (/\bmañana\b/.test(low)) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  const rel = low.match(/\ben\s+(\d+)\s*(d[ií]as|semanas|meses)\b/);
  if (rel) {
    const n = Number(rel[1]); const unit = rel[2];
    const d = new Date(now);
    if (/d[ií]as/.test(unit)) d.setDate(d.getDate() + n);
    else if (/semanas/.test(unit)) d.setDate(d.getDate() + n * 7);
    else d.setMonth(d.getMonth() + n);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  // yyyy-mm-dd
  const iso = q.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // dd/mm[/yyyy]
  const dm = q.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (dm) {
    const d = Number(dm[1]), m = Number(dm[2]);
    let y = dm[3] ? Number(dm[3]) : now.getFullYear();
    if (y < 100) y += 2000;
    // corrección simple: si fecha ya pasó este año y no trae año, empuja al próximo
    const candidate = new Date(y, m - 1, d);
    if (!dm[3] && candidate < now) candidate.setFullYear(y + 1);
    return `${candidate.getFullYear()}-${pad2(candidate.getMonth() + 1)}-${pad2(candidate.getDate())}`;
  }
  return null;
}

// Detecta intención de “recordatorio” o “servicio”
type NLIntent =
  | { kind: "reminder-date"; date: string; notes?: string }
  | { kind: "reminder-km"; km: number; notes?: string }
  | { kind: "service"; service_type: string; date?: string; km?: number; notes?: string }
  | { kind: "none" };

function detectIntent(q: string): NLIntent {
  const low = q.toLowerCase();
  const isReminder = /(recu[eé]rdame|recordatorio|av[ií]same|agenda(r)?)/.test(low);
  const isService = /(registrar|crear|agregar|añadir)\s+(servicio|mantenimiento)|\bservicio\s+de\b/.test(low);

  // Candidatos
  const km = parseKm(low);
  const date = parseDateMX(low);

  // Notas/servicio tipo: palabras clave simples
  const svcMap = [
    { key: "aceite", label: "aceite" },
    { key: "freno", label: "frenos" },
    { key: "bater", label: "batería" },
    { key: "llanta", label: "llantas" },
    { key: "neum", label: "llantas" },
    { key: "filtro", label: "filtro" },
    { key: "rotaci", label: "rotación de llantas" },
    { key: "aline", label: "alineación" },
    { key: "balance", label: "balanceo" },
    { key: "anticong", label: "anticongelante" },
    { key: "refriger", label: "refrigerante" },
  ];
  const svc = svcMap.find(s => low.includes(s.key))?.label || (low.includes("servicio") ? "servicio" : undefined);

  if (isReminder) {
    if (km != null) return { kind: "reminder-km", km, notes: svc };
    if (date) return { kind: "reminder-date", date, notes: svc };
    // si no hay fecha/km pero pide recordar, intenta por fecha “hoy” + 7 días
    const fallback = parseDateMX("en 7 dias");
    return fallback ? { kind: "reminder-date", date: fallback, notes: svc } : { kind: "none" };
  }
  if (isService || /servicio\s+de\b/.test(low)) {
    if (svc) return { kind: "service", service_type: svc, date: date || undefined, km: km || undefined, notes: undefined };
    // Si no encontramos tipo, pero dice “servicio” y trae fecha/km, igual lo registramos genérico
    if (date || km != null) return { kind: "service", service_type: "servicio", date: date || undefined, km: km || undefined };
  }
  return { kind: "none" };
}

export default function Chatbot() {
  // ==== Estado de chat ====
  const [chat, setChat] = useState<UIMsg[]>([
    { role: "assistant", content: "Soy el asistente de CarSense. Elige un vehículo y usa los paneles de Servicios y Recordatorios, o pregúntame lo que necesites.", ts: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ==== Vehículo activo + memoria ====
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<number | null>(() => {
    const saved = localStorage.getItem("chat.activeVehicleId");
    return saved ? Number(saved) : null;
  });
  useEffect(() => { if (activeId != null) localStorage.setItem("chat.activeVehicleId", String(activeId)); }, [activeId]);
  const activeVehicle = useMemo(() => vehicles.find((v) => v.id === activeId) || null, [vehicles, activeId]);

  // ==== Servicios ====
  const [svcLoading, setSvcLoading] = useState(false);
  const [services, setServices] = useState<Svc[]>([]);
  const [svcPanelOpen, setSvcPanelOpen] = useState(true);
  const [undoInfo, setUndoInfo] = useState<{ item: Svc; timer: number } | null>(null);

  // ==== Recordatorios ====
  const [remLoading, setRemLoading] = useState(false);
  const [rems, setRems] = useState<Rem[]>([]);
  const [remPanelOpen, setRemPanelOpen] = useState(true);
  const [rform, setRform] = useState<{ kind: "date" | "odometer"; date: string; km: string; notes: string }>(
    { kind: "date", date: "", km: "", notes: "" }
  );

  // Sugerencias dinámicas
  const [suggestions, setSuggestions] = useState<string[]>([
    "¿Cada cuánto cambio el aceite?", "¿Presión correcta de llantas?", "Tengo P0171", "Mis frenos rechinan", "Mi batería ya no dura",
  ]);

  // Carga vehículos al entrar
  useEffect(() => {
    (async () => {
      try {
        const list = await getVehicles();
        setVehicles(list);
        if (list?.length && activeId == null) setActiveId(list[0].id);
      } catch (e) { console.warn("No se pudieron cargar vehículos", e); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carga servicios/recordatorios al cambiar vehículo
  useEffect(() => {
    if (!activeId) return;
    (async () => {
      setSvcLoading(true); setRemLoading(true);
      try {
        const arr = await listServices(activeId);
        setServices(arr.map(toSvc));
      } catch { setServices([]); } finally { setSvcLoading(false); }
      try {
        const r = await listReminders(activeId);
        setRems(r.map(toRem));
      } catch { setRems([]); } finally { setRemLoading(false); }
    })();
  }, [activeId]);

  // Ajusta chips según vehículo activo
  useEffect(() => {
    if (!activeVehicle) return;
    const name = `${activeVehicle.make} ${activeVehicle.model} ${activeVehicle.year ?? ""}`.trim();
    setSuggestions([`Resumen de ${name}`, "Próximos servicios", "Añadir servicio", "Crear recordatorio", "Checklist de mantenimiento"]);
  }, [activeVehicle?.id]);

  // Scroll auto
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [chat, loading]);

  // ---- Router simple para enriquecer preguntas (OBD, /intents)
  function smartPrompt(q: string) {
    const v = activeVehicle || null;
    const lower = q.trim().toLowerCase();
    const m = lower.match(/\b(p\d{4})\b/);
    if (m) return `Tengo el código OBD-II ${m[1].toUpperCase()}. ${INTENTS.obd(v)}`;
    if (lower.startsWith("/")) {
      const key = lower.slice(1).split(/\s+/)[0];
      if (INTENTS[key]) return INTENTS[key](v);
      if (key === "ayuda") return `Atajos: /aceite /llantas /frenos /bateria /viaje /consumo /liquidos /clima /suspension /luces`;
    }
    if (lower.includes("aceite")) return INTENTS.aceite(v);
    if (lower.includes("llanta") || lower.includes("neum")) return INTENTS.llantas();
    if (lower.includes("freno")) return INTENTS.frenos();
    if (lower.includes("bater")) return INTENTS.bateria();
    if (lower.includes("viaje")) return INTENTS.viaje();
    if (lower.includes("consumo")) return INTENTS.consumo();
    if (lower.includes("aire") || lower.includes("a/c") || lower.includes("clima")) return INTENTS.clima();
    if (lower.includes("susp")) return INTENTS.suspension();
    if (lower.includes("luz") || lower.includes("warning") || lower.includes("testigo")) return INTENTS.luces();
    return q;
  }

  // ---- INTENCIÓN ACCIONABLE: crea recordatorios/servicios si se detecta
  async function tryHandleNL(questionRaw: string): Promise<boolean> {
    if (!activeId) return false;
    const intent = detectIntent(questionRaw);
    if (intent.kind === "none") return false;

    if (intent.kind === "reminder-date") {
      const payload: any = { vehicle_id: activeId, kind: "date", due_date: intent.date, notes: intent.notes };
      const created = await addReminder(payload);
      const msg = `✅ Recordatorio por fecha creado: ${intent.date}${intent.notes ? ` — ${intent.notes}` : ""}`;
      setChat(c => [...c, { role: "assistant", content: msg, ts: Date.now() }]);
      setRems(prev => [toRem(created), ...prev]);
      return true;
    }
    if (intent.kind === "reminder-km") {
      const payload: any = { vehicle_id: activeId, kind: "odometer", due_km: intent.km, notes: intent.notes };
      const created = await addReminder(payload);
      const msg = `✅ Recordatorio por odómetro creado: ${intent.km.toLocaleString()} km${intent.notes ? ` — ${intent.notes}` : ""}`;
      setChat(c => [...c, { role: "assistant", content: msg, ts: Date.now() }]);
      setRems(prev => [toRem(created), ...prev]);
      return true;
    }
    if (intent.kind === "service") {
      const payload: any = {
        vehicle_id: activeId,
        service_type: intent.service_type,
        date: intent.date,
        km: intent.km,
        notes: intent.notes,
      };
      const created = await apiAddService(payload);
      const pieces = [
        `✅ Servicio creado: ${intent.service_type}`,
        intent.date ? `fecha ${intent.date}` : null,
        intent.km != null ? `${intent.km.toLocaleString()} km` : null,
      ].filter(Boolean);
      setChat(c => [...c, { role: "assistant", content: pieces.join(" — "), ts: Date.now() }]);
      setServices(prev => [toSvc(created), ...prev]);
      return true;
    }
    return false;
  }

  // Enviar mensaje
  async function send(text?: string) {
    const questionRaw = (text ?? input).trim();
    if (!questionRaw) return;

    // Muestra de inmediato lo que escribió el usuario
    const userMsg: UIMsg = { role: "user", content: questionRaw, ts: Date.now() };
    const next: UIMsg[] = [...chat, userMsg];
    setChat(next);
    setInput("");
    setLoading(true);

    try {
      // 1) Intento: acción directa (recordatorio/servicio)
      const handled = await tryHandleNL(questionRaw);
      if (handled) return; // ya respondimos y actualizamos estado

      // 2) Si no hubo acción, enriquecemos la pregunta y consultamos respuesta offline del backend
      const question = smartPrompt(questionRaw);

      const prefix =
        (activeVehicle
          ? `Contexto:
- Vehículo: ${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.year ?? "s/a"})
- Odómetro: ${activeVehicle.odometer_km ?? 0} km

`
          : "") +
        `Instrucciones de estilo:
Responde en español, claro y accionable. Usa este formato cuando aplique:
1) Diagnóstico rápido (qué significa / causas probables)
2) Acciones inmediatas (pasos concretos, con prioridad)
3) Checklist de verificación (3–8 ítems)
4) Riesgos y cuándo ir al taller (señales de urgencia)
5) Costos/tiempos aproximados (si aplica)
6) Prevención (hábitos y periodicidad)
Termina con 3–5 preguntas de seguimiento útiles en viñetas.`;

      const { text: reply, followups } = await askChatbot([
        { role: "system", content: prefix } as ChatMessage,
        ...next,
        { role: "user", content: question } as ChatMessage,
      ]);
      setChat(c => [...c, { role: "assistant", content: reply, ts: Date.now() }]);
      if (followups && followups.length) setSuggestions(followups.slice(0, 8));
    } catch (e: any) {
      setChat(c => [...c, { role: "assistant", content: `No pude responder: ${e?.message ?? e}`, ts: Date.now() }]);
    } finally { setLoading(false); }
  }

  // Acciones rápidas
  function actionPrompt(kind: string) {
    if (!activeVehicle) return;
    const name = `${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.year ?? "s/a"})`;
    switch (kind) {
      case "proximos":
        send(`Con base en ${name} y ${activeVehicle.odometer_km ?? 0} km, dime los próximos servicios con kilometrajes y tiempos.`);
        break;
      case "agregar":
        setSvcPanelOpen(true);
        setTimeout(() => (document.getElementById("svc-type-input") as HTMLInputElement | null)?.focus(), 0);
        break;
      case "checklist":
        send(`Dame un checklist breve de mantenimiento preventivo para ${name} considerando uso diario en ciudad.`);
        break;
      default:
        setRemPanelOpen(true);
        setTimeout(() => (document.getElementById("rem-notes") as HTMLInputElement | null)?.focus(), 0);
        break;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // Crear servicio (form)
  async function submitService(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    const payload = {
      vehicle_id: activeId,
      service_type: (document.getElementById("svc-type-input") as HTMLInputElement)?.value || "",
      date: (document.querySelector("#svc-form-date") as HTMLInputElement)?.value || undefined,
      km: (document.querySelector("#svc-form-km") as HTMLInputElement)?.value || undefined,
      notes: (document.querySelector("#svc-form-notes") as HTMLInputElement)?.value || undefined,
    };
    try {
      const created = await apiAddService(payload as any);
      setServices((prev) => [toSvc(created), ...prev]);
      (document.getElementById("svc-type-input") as HTMLInputElement).value = "";
      (document.getElementById("svc-form-date") as HTMLInputElement | null)?.setAttribute("value", "");
      (document.getElementById("svc-form-km") as HTMLInputElement | null)?.setAttribute("value", "");
      (document.getElementById("svc-form-notes") as HTMLInputElement | null)?.setAttribute("value", "");
    } catch (e) { alert("No se pudo crear el servicio."); console.error(e); }
  }

  // Borrar servicio con deshacer
  function scheduleDelete(s: Svc) {
    if (undoInfo?.item?.id === s.id) return;
    setServices((prev) => prev.filter((x) => x.id !== s.id));
    const timer = window.setTimeout(async () => {
      try { await deleteService(s.id); setUndoInfo(null); }
      catch (e) { setServices((prev) => [s, ...prev]); setUndoInfo(null); alert("No se pudo eliminar en el servidor."); console.error(e); }
    }, 6000);
    setUndoInfo({ item: s, timer });
  }
  function undoDelete() { if (!undoInfo) return; window.clearTimeout(undoInfo.timer); setServices((prev) => [undoInfo.item, ...prev]); setUndoInfo(null); }

  // Crear recordatorio (form)
  async function submitReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    const payload: any = { vehicle_id: activeId, kind: rform.kind, notes: rform.notes || undefined };
    if (rform.kind === "date") payload.due_date = rform.date || undefined; else payload.due_km = rform.km ? Number(rform.km) : undefined;
    try {
      const created = await addReminder(payload);
      setRems((prev) => [toRem(created), ...prev]);
      setRform({ kind: "date", date: "", km: "", notes: "" });
    } catch (e) { alert("No se pudo crear el recordatorio."); console.error(e); }
  }

  return (
    <section style={{ display: "grid", gridTemplateRows: "auto auto auto 1fr auto", gap: 12, height: "calc(100vh - 140px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Asistente de CarSense</h1>
          <p className="muted">Mantenimiento, OBD-II y próximas acciones.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, opacity: 0.75 }}>Vehículo:</label>
          <select className="input" value={activeId ?? ""} onChange={(e) => setActiveId(Number(e.target.value) || null)} style={{ minWidth: 240 }}>
            {!vehicles.length && <option value="">— sin vehículos —</option>}
            {vehicles.map((v) => (<option key={v.id} value={v.id}>{v.make} {v.model} {v.year ?? ""} — {v.odometer_km ?? 0} km</option>))}
          </select>
        </div>
      </div>

      {/* Panel Servicios */}
      <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginRight: "auto" }}>Servicios</h2>
          <button className="chip" onClick={() => setSvcPanelOpen((v) => !v)}>{svcPanelOpen ? "Ocultar" : "Mostrar"}</button>
        </div>
        {svcPanelOpen && (
          <>
            <form onSubmit={submitService} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 2fr auto", gap: 8, marginTop: 10 }}>
              <input id="svc-type-input" className="input" placeholder="Tipo (aceite, frenos, batería...)" />
              <input id="svc-form-date" className="input" type="date" />
              <input id="svc-form-km" className="input" type="number" placeholder="Km" />
              <input id="svc-form-notes" className="input" placeholder="Notas (opcional)" />
              <button className="btn" disabled={!activeId}>Añadir</button>
            </form>
            <div style={{ marginTop: 12 }}>
              {svcLoading && <div style={{ opacity: 0.7 }}>Cargando servicios…</div>}
              {!svcLoading && services.length === 0 && <div style={{ opacity: 0.7 }}>No hay servicios registrados.</div>}
              <div style={{ display: "grid", gap: 8 }}>
                {services.map((s) => (
                  <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", padding: 10, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{s.service_type || "Servicio"} <span style={{ opacity: 0.6 }}>#{s.id}</span></div>
                      <div style={{ fontSize: 13, opacity: 0.8 }}>{s.date ? `Fecha: ${s.date}` : "Sin fecha"} • {s.km != null ? `${s.km} km` : "km s/d"}</div>
                      {s.notes && <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>{s.notes}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="badge" onClick={() => scheduleDelete(s)}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Panel Recordatorios */}
      <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginRight: "auto" }}>Recordatorios</h2>
          <button className="chip" onClick={() => setRemPanelOpen((v) => !v)}>{remPanelOpen ? "Ocultar" : "Mostrar"}</button>
        </div>
        {remPanelOpen && (
          <>
            <form onSubmit={submitReminder} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 8, marginTop: 10 }}>
              <select className="input" value={rform.kind} onChange={(e) => setRform((f) => ({ ...f, kind: e.target.value as any }))}>
                <option value="date">Por fecha</option>
                <option value="odometer">Por km</option>
              </select>
              {rform.kind === "date" ? (
                <input className="input" type="date" value={rform.date} onChange={(e) => setRform((f) => ({ ...f, date: e.target.value }))} />
              ) : (
                <input className="input" type="number" placeholder="Km objetivo" value={rform.km} onChange={(e) => setRform((f) => ({ ...f, km: e.target.value }))} />
              )}
              <input id="rem-notes" className="input" placeholder="Notas (opcional)" value={rform.notes} onChange={(e) => setRform((f) => ({ ...f, notes: e.target.value }))} />
              <button className="btn" disabled={!activeId}>Crear</button>
            </form>
            <div style={{ marginTop: 12 }}>
              {remLoading && <div style={{ opacity: 0.7 }}>Cargando recordatorios…</div>}
              {!remLoading && rems.length === 0 && <div style={{ opacity: 0.7 }}>No hay recordatorios.</div>}
              <div style={{ display: "grid", gap: 8 }}>
                {rems.map((r) => (
                  <div key={r.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", alignItems: "center", gap: 8, padding: 10, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
                    <input type="checkbox" checked={!!r.done} onChange={() => toggleReminder(r.id).then(() => setRems((prev) => prev.map(x => x.id === r.id ? { ...x, done: !x.done } : x)))} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{r.kind === "date" ? (r.due_date || "—") : `${r.due_km ?? "—"} km`} <span style={{ opacity: 0.6 }}>#{r.id}</span></div>
                      {r.notes && <div style={{ fontSize: 13, opacity: 0.8 }}>{r.notes}</div>}
                    </div>
                    <button className="badge" onClick={() => deleteReminder(r.id).then(() => setRems(prev => prev.filter(x => x.id !== r.id)))}>Eliminar</button>
                    <span style={{ fontSize: 12, opacity: 0.6 }}>{r.kind}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Timeline del chat */}
      <div ref={scroller} style={{ overflowY: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12 }}>
        {chat.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div key={i} style={{ display: "flex", gap: 8, justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
              {!isUser && (<div style={{ width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(255,255,255,.08)", fontSize: 14 }}>🤖</div>)}
              <div>
                <div style={{ maxWidth: 760, padding: "8px 12px", borderRadius: 12, background: isUser ? "rgba(59,130,246,.15)" : "rgba(255,255,255,.06)", border: isUser ? "1px solid rgba(59,130,246,.35)" : "1px solid rgba(255,255,255,.08)", whiteSpace: "pre-wrap" }}>{m.content}</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, textAlign: isUser ? "right" : "left" }}>{hhmm(new Date(m.ts))}</div>
                {i === chat.length - 1 && m.role === "assistant" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button className="chip" onClick={() => actionPrompt("proximos")}>Ver próximos servicios</button>
                    <button className="chip" onClick={() => actionPrompt("agregar")}>Añadir servicio</button>
                    <button className="chip" onClick={() => actionPrompt("recordatorio")}>Crear recordatorio</button>
                  </div>
                )}
              </div>
              {isUser && (<div style={{ width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(59,130,246,.25)", border: "1px solid rgba(59,130,246,.35)", fontSize: 14 }}>🧑</div>)}
            </div>
          );
        })}
        {loading && <div style={{ opacity: 0.7, fontStyle: "italic", marginBottom: 8 }}>Escribiendo…</div>}
      </div>

      {/* Entrada */}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
        <textarea className="input" rows={2} placeholder='Ej: "recuérdame aceite a 15000 km" o "servicio de frenos 15/12"' value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} />
        <button className="btn" disabled={loading || !input.trim()}>{loading ? "Enviando…" : "Enviar"}</button>
      </form>

      {/* Barra de deshacer */}
      {undoInfo && (
        <div style={{ position: "fixed", left: 16, bottom: 16, display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)" }}>
          <div><b>Servicio #{undoInfo.item.id}</b> se eliminará en unos segundos.</div>
          <button className="btn" onClick={undoDelete}>Deshacer</button>
        </div>
      )}

      {/* Sugerencias + fuentes */}
      <div style={{ display: "grid", gap: 10 }}>
        <details open>
          <summary className="badge">Preguntas rápidas</summary>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {[
              "/aceite", "/llantas", "/frenos", "/bateria", "/viaje",
              "/consumo", "/liquidos", "/clima", "/suspension", "/luces",
              "Tengo P0171", "Tengo P0420", "Vibra al frenar", "Huele a gasolina",
              "Se calienta en tráfico", "¿Qué revisar primero?",
            ].map((s, i) => (
              <button key={i} className="badge" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        </details>

        <details>
          <summary className="badge">Fuentes útiles</summary>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <a className="chip" href={SOURCE_LINKS.tirewise} target="_blank">NHTSA – TireWise</a>
            <a className="chip" href={SOURCE_LINKS.epa_obd} target="_blank">EPA – OBD Monitors</a>
            <a className="chip" href={SOURCE_LINKS.kbb_p0171} target="_blank">KBB – P0171</a>
            <a className="chip" href={SOURCE_LINKS.kbb_p0420} target="_blank">KBB – P0420</a>
            <a className="chip" href={SOURCE_LINKS.soc_voltage} target="_blank">Voltaje batería 12V</a>
            <a className="chip" href={SOURCE_LINKS.aaa_frenos} target="_blank">AAA – Líquido de frenos</a>
          </div>
        </details>
      </div>
    </section>
  );
}
