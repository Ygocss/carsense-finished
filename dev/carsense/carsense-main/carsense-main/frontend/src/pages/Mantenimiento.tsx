import { useEffect, useMemo, useState } from "react";
import {
  getVehicles, getVehicle, createVehicle, updateVehicle,
  listServices, createService, deleteService, api
} from "../api/client";

type Vehicle = {
  id: number;
  make: string;
  model: string;
  year: number;
  odometer_km?: number;
  next_service_km?: number;
};

type Service = {
  id: number;
  vehicle_id: number;
  service_type: string;
  date: string | null;
  km: number;
  notes?: string | null;
};

type Rule = { key: string; km?: number; months?: number; aliases: string[]; hint?: string; };

const RULES: Rule[] = [
  { key: "Cambio de aceite",   km: 8000,  months: 6,  aliases: ["aceite","cambio de aceite"], hint: "Menor desgaste del motor" },
  { key: "Filtro de aceite",   km: 8000,  months: 6,  aliases: ["filtro de aceite"],          hint: "Cámbialo con el aceite" },
  { key: "Rotación",           km: 12000, months: 12, aliases: ["rotación","rotacion"],        hint: "Desgaste uniforme de llantas" },
  { key: "Filtro de aire",     km: 12000, months: 12, aliases: ["filtro de aire"] },
  { key: "Pastillas de freno", km: 25000, months: 24, aliases: ["pastillas","frenos"] },
  { key: "Líquido de frenos",  km: 40000, months: 24, aliases: ["líquido de frenos","liquido de frenos","dot4"] },
  { key: "Filtro cabina",      km: 15000, months: 12, aliases: ["filtro cabina","cabina"] },
  { key: "Bujías",             km: 60000, months: 48, aliases: ["bujías","bujias"] },
  { key: "Coolant",            km: 50000, months: 36, aliases: ["coolant","refrigerante"] },
  { key: "Revisión general",   km: 12000, months: 12, aliases: ["revisión general","revision general"] },
];

const fmt = (n?: number) => new Intl.NumberFormat("es-MX").format(n ?? 0);

// Fecha local YYYY-MM-DD (sin desfases por UTC)
const toLocalDate = (d: Date) => {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
};
const todayStr = () => toLocalDate(new Date());

const addMonths = (d: Date, m: number) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const nearestUpperMultiple = (x: number, step: number) => step > 0 ? Math.ceil(x / step) * step : x;
const nextUpperStrict = (x: number, step: number) => {
  const m = nearestUpperMultiple(x, step);
  return m <= x ? m + step : m;
};

function matchRuleName(serviceType: string): Rule | undefined {
  const n = normalize(serviceType);
  return RULES.find(r => r.aliases.some(a => n.includes(normalize(a))) || n === normalize(r.key));
}

function estimateDailyKm(services: Service[], currentOdo: number): number {
  const ordered = services
    .filter(s => s.km > 0 && s.date)
    .sort((a,b)=> String(a.date ?? "").localeCompare(String(b.date ?? "")));
  if (ordered.length >= 2) {
    const a = ordered[0], b = ordered[ordered.length - 1];
    const d = Math.max(1, daysBetween(new Date(a.date as string), new Date(b.date as string)));
    const dk = Math.max(0, (b.km ?? 0) - (a.km ?? 0));
    const est = dk / d;
    if (isFinite(est) && est > 5) return Math.min(est, 200);
  }
  if (currentOdo > 0) return Math.max(20, Math.min(120, currentOdo / 365));
  return 35;
}

type Reco = {
  rule: Rule;
  dueKm?: number;
  dueDate?: Date;
  remainKm?: number;
  status: "OK" | "PRONTO" | "VENCIDO";
  last?: { km?: number; date?: Date };
};

// --- Recordatorios (solo front, localStorage) ---
type Reminder = {
  id: string;
  vehicle_id: number;
  title: string;
  due_date?: string;   // YYYY-MM-DD
  due_km?: number;
  created_at: string;  // YYYY-MM-DD
};
const REM_KEY = "carsense.reminders";
const loadRems = (): Reminder[] => {
  try { return JSON.parse(localStorage.getItem(REM_KEY) || "[]"); } catch { return []; }
};
const saveRems = (rs: Reminder[]) => localStorage.setItem(REM_KEY, JSON.stringify(rs));

export default function Mantenimiento() {
  const [vehiculos, setVehiculos] = useState<Vehicle[]>([]);
  const [vehSel, setVehSel] = useState<number | null>(null);
  const [servicios, setServicios] = useState<Service[]>([]);
  const [rems, setRems] = useState<Reminder[]>([]);

  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anio, setAnio] = useState<number | "">("");
  const [odo, setOdo] = useState<number | "">("");

  const [tipo, setTipo] = useState("Cambio de aceite");
  const [fecha, setFecha] = useState(() => todayStr());
  const [km, setKm] = useState<number | "">("");
  const [notas, setNotas] = useState("");

  const [kmDia, setKmDia] = useState<number>(35);
  const [autoAdd, setAutoAdd] = useState<boolean>(false);

  async function cargarVehiculos() {
    const v: Vehicle[] = (await getVehicles()) || [];
    setVehiculos(v);
    if (v.length && vehSel == null) setVehSel(v[0].id);
    if (!v.length) setVehSel(null);
  }
  async function cargarServicios(vehicleId: number | null) {
    if (!vehicleId) { setServicios([]); return; }
    try {
      const arr = (await listServices(vehicleId)) as Service[];
      const normalized = arr.map(s => ({ ...s, date: (s.date ?? null), km: Number(s.km ?? 0) }));
      setServicios(normalized.filter(s => s.vehicle_id === vehicleId));
    } catch { setServicios([]); }
  }

  useEffect(() => { cargarVehiculos(); }, []);
  useEffect(() => { cargarServicios(vehSel); }, [vehSel]);
  useEffect(() => { setRems(loadRems()); }, []);
  useEffect(() => { saveRems(rems); }, [rems]);

  // firstSeen: evita marcar PRONTO/VENCIDO en autos recién agregados
  useEffect(() => {
    if (!vehSel) return;
    const k = `carsense.firstSeen.${vehSel}`;
    if (!localStorage.getItem(k)) localStorage.setItem(k, String(Date.now()));
  }, [vehSel]);

  useEffect(() => {
    if (!vehSel) return;
    const v = vehiculos.find(x => x.id === vehSel);
    setKmDia(estimateDailyKm(servicios, v?.odometer_km ?? 0));
  }, [vehSel, servicios, vehiculos]);

  async function onGuardarVeh() {
    const payload = {
      make: (marca || "Marca").trim(),
      model: (modelo || "Modelo").trim(),
      year: Number(anio || 2025),
      odometer_km: Number(odo || 0),
    };
    await createVehicle(payload);
    setMarca(""); setModelo(""); setAnio(""); setOdo("");
    await cargarVehiculos();
  }

  // *** CORREGIDO: no propagamos v completo; enviamos Partial<Omit<Vehicle,"id">> ***
  async function onMasMil() {
    if (!vehSel) return;
    const v = (await getVehicle(vehSel)) as Vehicle | null;
    if (!v) return;

    const payload: Partial<Omit<Vehicle, "id">> = {
      odometer_km: (v.odometer_km ?? 0) + 1000
    };

    await updateVehicle(vehSel, payload);
    await cargarVehiculos();
    await cargarServicios(vehSel);
  }

  async function onAgregarServicio() {
    if (!vehSel) return;
    const currentOdo = vehiculos.find(v => v.id === vehSel)?.odometer_km ?? 0;
    const kmVal = km === "" ? currentOdo : Number(km);

    // Si el tipo coincide con una regla, anotamos el “siguiente sugerido” en notas
    const r = matchRuleName(tipo);
    let extraNote = "";
    if (r) {
      const nextKm = r.km ? kmVal + r.km : undefined;
      const nextDate = r.months ? toLocalDate(addMonths(new Date(), r.months)) : undefined;
      if (nextKm || nextDate) {
        extraNote = ` | Siguiente sugerido: ${nextDate ?? "—"}${nextKm ? ` (~${fmt(nextKm)} km)` : ""}`;
      }
    }

    const payload = {
      vehicle_id: vehSel,
      service_type: tipo,
      date: fecha,
      km: kmVal,
      notes: (notas.trim() || "—") + extraNote,
    };
    await createService(payload);
    setTipo("Cambio de aceite");
    setFecha(todayStr());
    setKm(""); setNotas("");
    await cargarServicios(vehSel);
  }

  

  // ---- Eliminar servicio (optimista con rollback) ----
  async function onEliminarServicio(id: number) {
    const s = servicios.find(x => x.id === id);
    if (!s) return;

    if (!confirm(`¿Eliminar el servicio #${id}? Esta acción no se puede deshacer.`)) return;

    const snapshot = servicios;                           // para rollback
    setServicios(prev => prev.filter(x => x.id !== id));  // quita al instante

    try {
      await deleteService(id);                            // DELETE /api/v1/services/{id}
      if (vehSel != null) await cargarServicios(vehSel);  // refresco desde server (opcional)
    } catch (e) {
      setServicios(snapshot);                             // rollback
      console.error("Error al eliminar servicio:", e);
      alert("No se pudo eliminar el servicio.");
    }
  }




  // ---- Eliminar vehículo seleccionado ----
  async function onEliminarVehiculo() {
    if (!vehSel) return;

    const v = vehiculos.find(x => x.id === vehSel);
    const name = v ? `${v.make} ${v.model} (${v.year ?? ""})` : `#${vehSel}`;
    if (!confirm(`¿Eliminar el vehículo ${name}? Se perderá su historial.`)) return;

    try {
      // FastAPI: sin slash final
      const path = `/api/v1/vehicles/${vehSel}`;
      await api.delete(path);

      // Actualiza estado local sin recargar todo
      setRems(rs => rs.filter(r => r.vehicle_id !== vehSel));
      setVehiculos(prev => prev.filter(x => x.id !== vehSel));
      setVehSel(null);              // limpia selección
      // Si tienes una lista de servicios en memoria, límpiala también:
      // setServicios(s => s.filter(sr => sr.vehicle_id !== vehSel));

      // Si prefieres recargar del servidor:
      // await cargarVehiculos();
      // ❌ No llames cargarServicios(vehSel) porque el vehículo ya no existe.
    } catch (e: any) {
      const st = e?.response?.status;
      if (st === 404) {
        alert("El backend no reconoce DELETE /api/v1/vehicles/{id} o el id no existe.");
      } else if (st === 401 || st === 403) {
        alert("No autorizado para borrar (revisa tu token).");
      } else {
        console.error(e);
        alert("No se pudo eliminar el vehículo.");
      }
    }
  }

  const vehActual = useMemo(() => vehiculos.find(v => v.id === vehSel) || null, [vehSel, vehiculos]);

  function isFreshNewVehicle(vehicle: Vehicle): boolean {
    const k = `carsense.firstSeen.${vehicle.id}`;
    const t = Number(localStorage.getItem(k) || "0");
    if (!t) return false;
    const DIAS_GRACIA = 14;
    return (Date.now() - t) < DIAS_GRACIA * 86400000;
  }

  function buildRecos(vehicle: Vehicle | null, services: Service[], kmDiaVal: number): Reco[] {
    if (!vehicle) return [];
    const odo = vehicle.odometer_km ?? 0;
    const now = new Date();
    const fresh = isFreshNewVehicle(vehicle);

    return RULES.map(rule => {
      const history = services
        .filter(s => s.vehicle_id === vehicle.id)
        .filter(s => (matchRuleName(s.service_type)?.key ?? s.service_type) === rule.key)
        .sort((a,b)=> String(a.date ?? "").localeCompare(String(b.date ?? "")));

      const last = history.length ? history[history.length - 1] : undefined;
      const lastKm = last?.km;
      const lastDate = last?.date ? new Date(last.date as string) : undefined;

      const dueKm =
        rule.km
          ? (lastKm != null ? lastKm + rule.km : nextUpperStrict(odo, rule.km))
          : undefined;

      const projDaysFromKm =
        rule.km && dueKm != null ? Math.max(0, Math.ceil((dueKm - odo) / Math.max(1, kmDiaVal))) : undefined;
      const projDateFromKm = projDaysFromKm != null ? new Date(now.getTime() + projDaysFromKm * 86400000) : undefined;

      const monthsBase = lastDate ?? now;
      const dateByMonths = rule.months ? addMonths(monthsBase, rule.months) : undefined;

      const dueDate =
        dateByMonths && projDateFromKm
          ? (dateByMonths.getTime() < projDateFromKm.getTime() ? dateByMonths : projDateFromKm)
          : (dateByMonths || projDateFromKm);

      const remainKm = dueKm != null ? dueKm - odo : undefined;

      let status: Reco["status"] = "OK";
      const soonKm = 1000, soonDays = 30;
      const overKm = remainKm != null && remainKm <= 0;
      const overDate = dueDate != null && daysBetween(now, dueDate) <= 0;

      if (!last) {
        status = fresh ? "OK" :
          ((remainKm != null && remainKm <= soonKm) || (dueDate != null && daysBetween(now, dueDate) <= soonDays) ? "PRONTO" : "OK");
      } else {
        if (overKm || overDate) status = "VENCIDO";
        else if ((remainKm != null && remainKm <= soonKm) || (dueDate != null && daysBetween(now, dueDate) <= soonDays)) status = "PRONTO";
      }

      return { rule, dueKm, dueDate, remainKm, status, last: last ? { km: lastKm, date: lastDate } : undefined };
    }).sort((a,b) => {
      const rank = (s: Reco["status"]) => s === "VENCIDO" ? 0 : s === "PRONTO" ? 1 : 2;
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      const ak = a.remainKm ?? Number.POSITIVE_INFINITY;
      const bk = b.remainKm ?? Number.POSITIVE_INFINITY;
      return ak - bk;
    });
  }

  const recos = useMemo(() => buildRecos(vehActual, servicios, kmDia), [vehActual, servicios, kmDia]);
  const vencidos = recos.filter(r => r.status === "VENCIDO");
  const pronto   = recos.filter(r => r.status === "PRONTO");

  // Auto-agregar vencidos (si hay historial) una sola vez por día
  useEffect(() => {
    if (!vehSel || !autoAdd || !vencidos.length) return;
    const hasHistory = servicios.some(s => s.vehicle_id === vehSel);
    if (!hasHistory) return;
    const key = `carsense.autoday.${vehSel}.${todayStr()}`;
    if (localStorage.getItem(key)) return;

    (async () => {
      for (const r of vencidos) {
        const existsToday = servicios.some(
          s => s.vehicle_id === vehSel &&
               (matchRuleName(s.service_type)?.key ?? s.service_type) === r.rule.key &&
               s.date === todayStr()
        );
        if (existsToday) continue;
        const odom = vehiculos.find(v => v.id === vehSel)?.odometer_km ?? 0;
        await createService({
          vehicle_id: vehSel,
          service_type: r.rule.key,
          date: todayStr(),
          km: odom,
          notes: "Agregado automáticamente (vencido)",
        });
      }
      localStorage.setItem(key, "1");
      await cargarServicios(vehSel);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehSel, autoAdd, vencidos.length]);

  // Crear recordatorio desde una reco
  function addReminderFromReco(r: Reco) {
    if (!vehSel) return;
    const id = `${vehSel}-${r.rule.key}-${Date.now()}`;
    const due_date = r.dueDate ? toLocalDate(r.dueDate) : undefined;
    const due_km = r.dueKm;
    const newR: Reminder = {
      id, vehicle_id: vehSel, title: r.rule.key,
      due_date, due_km, created_at: todayStr()
    };
    setRems(prev => [newR, ...prev]);
  }
  function removeReminder(id: string) {
    setRems(prev => prev.filter(r => r.id !== id));
  }

  // Agregar servicio rápido + generar siguiente sugerencia y recordatorio
  async function quickAdd(name: string) {
    if (!vehSel) return;
    const odom = vehiculos.find(v => v.id === vehSel)?.odometer_km ?? 0;
    const rule = matchRuleName(name);
    let note = "Agregado desde recomendados";
    if (rule) {
      const nextKm = rule.km ? odom + rule.km : undefined;
      const nextDate = rule.months ? toLocalDate(addMonths(new Date(), rule.months)) : undefined;
      if (nextKm || nextDate) note += ` | Siguiente sugerido: ${nextDate ?? "—"}${nextKm ? ` (~${fmt(nextKm)} km)` : ""}`;
      // Además, creamos recordatorio del siguiente
      setRems(prev => [
        {
          id: `${vehSel}-${name}-next-${Date.now()}`,
          vehicle_id: vehSel,
          title: name,
          due_date: nextDate,
          due_km: nextKm,
          created_at: todayStr()
        },
        ...prev
      ]);
    }
    await createService({
      vehicle_id: vehSel,
      service_type: name,
      date: todayStr(),
      km: odom,
      notes: note,
    });
    await cargarServicios(vehSel);
  }

  // Alertas: recordatorios a ≤7 días o ≤500 km
  const alerts = useMemo(() => {
    if (!vehSel) return [];
    const now = new Date();
    const v = vehiculos.find(x => x.id === vehSel);
    const odo = v?.odometer_km ?? 0;
    const withinDays = 7, withinKm = 500;

    return rems
      .filter(r => r.vehicle_id === vehSel)
      .filter(r => {
        const byDate = r.due_date ? daysBetween(now, new Date(r.due_date)) <= withinDays : false;
        const byKm = r.due_km != null ? (r.due_km - odo) <= withinKm : false;
        return byDate || byKm;
      });
  }, [rems, vehSel, vehiculos]);

  return (
    <div className="mantenimiento">
      <div className="card">
        {/* ALERTAS */}
        {!!alerts.length && (
          <div className="panel" style={{ borderColor: "#e9b949", background: "#151e09" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong>Alertas</strong>
              <span className="badge">{alerts.length}</span>
            </div>
            <ul className="spec__list" style={{ marginTop: 6 }}>
              {alerts.map(a => (
                <li key={a.id}>
                  {a.title} —{" "}
                  {a.due_date ? `para ${a.due_date}` : ""}{a.due_date && a.due_km ? " · " : ""}
                  {a.due_km ? `~${fmt(a.due_km)} km` : ""}
                  <button className="btn btn--mini btn--ghost" style={{ marginLeft: 8 }}
                          onClick={() => removeReminder(a.id)}>
                    Ocultar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <h3 style={{ marginRight: "auto" }}>Mantenimiento</h3>
          <button className="btn btn-sm" onClick={onMasMil} disabled={!vehSel}>+1000 km</button>
          <button className="btn btn-sm" onClick={() => cargarServicios(vehSel)} disabled={!vehSel}>Refrescar</button>
          <a className="btn btn-sm btn-secondary" href="/historial">Exportar historial</a>
        </div>

        <div className="grid-2" style={{ marginTop: 12 }}>
          <div id="form-vehiculo" className="card soft">
            <h4>Agregar vehículo</h4>
            <div className="grid-2">
              <input placeholder="Marca" value={marca} onChange={e => setMarca(e.target.value)} />
              <input placeholder="Modelo" value={modelo} onChange={e => setModelo(e.target.value)} />
              <input type="number" placeholder="Año" value={anio} onChange={e => setAnio(e.target.value ? Number(e.target.value) : "")} />
              <input type="number" placeholder="Odómetro (km)" value={odo} onChange={e => setOdo(e.target.value ? Number(e.target.value) : "")} />
            </div>
            <button className="btn" onClick={onGuardarVeh}>Guardar</button>
            <div className="muted" style={{ marginTop: 6 }}>
              * Al agregar un vehículo sin historial, se considera “al día” por 14 días. Las próximas fechas/km se calculan desde hoy.
            </div>
          </div>

          <div className="card soft">
            <h4>Vehículos</h4>
            <select value={vehSel ?? ""} onChange={(e) => setVehSel(e.target.value ? Number(e.target.value) : null)}>
              {vehiculos.map(v => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} — {v.year} ({fmt(v.odometer_km)} km)
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button className="btn ghost" onClick={onEliminarVehiculo} disabled={!vehSel}>
                Eliminar vehículo
              </button>
            </div>

            {vehSel && (
              <div className="muted" style={{ marginTop: 6 }}>
                Estimación de uso: ~{Math.round(kmDia)} km/día
              </div>
            )}
          </div>
        </div>

        {vehActual && (
          <div className="card soft" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <h4 style={{ margin: 0 }}>Recomendados para {vehActual.make} {vehActual.model}</h4>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span className="badge">Vencidos: {vencidos.length}</span>
                <span className="badge">Pronto: {pronto.length}</span>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={autoAdd} onChange={e => setAutoAdd(e.target.checked)} />
                  Auto-agregar vencidos
                </label>
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14, marginTop: 10 }}>
              {recos.map((r, i) => (
                <div key={i} className="panel" style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{r.rule.key}</strong>
                    <span className="badge" style={{
                      borderColor: r.status === "VENCIDO" ? "#ff7b7b" : r.status === "PRONTO" ? "#e9b949" : undefined
                    }}>
                      {r.status}
                    </span>
                  </div>

                  <div className="muted" style={{ fontSize: 12 }}>
                    {r.rule.km ? `Cada ~${fmt(r.rule.km)} km` : ""}{r.rule.km && r.rule.months ? " · " : ""}
                    {r.rule.months ? `Cada ~${r.rule.months} meses` : ""}
                  </div>
                  {r.rule.hint && <div className="muted" style={{ fontSize: 12 }}>{r.rule.hint}</div>}

                  <div style={{ display: "grid", gap: 4 }}>
                    {r.dueKm != null && (
                      <div>
                        Próximo a: <b>{fmt(r.dueKm)} km</b>
                        {r.remainKm != null && (
                          <span className="muted"> ({r.remainKm <= 0 ? `vencido ${fmt(Math.abs(r.remainKm))} km` : `faltan ${fmt(r.remainKm)} km`})</span>
                        )}
                      </div>
                    )}
                    {r.dueDate && (
                      <div>
                        Estimado: <b>{toLocalDate(r.dueDate)}</b>
                        <span className="muted"> ({daysBetween(new Date(), r.dueDate)} días)</span>
                      </div>
                    )}
                    {r.last?.date && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        Último: {toLocalDate(r.last.date)} {r.last.km ? `· ${fmt(r.last.km)} km` : ""}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn btn-sm" onClick={() => quickAdd(r.rule.key)}>Agregar ahora</button>
                    <button className="btn btn-sm btn--ghost" onClick={() => addReminderFromReco(r)}>Recordarme</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div id="form-servicio" className="card soft" style={{ marginTop: 12 }}>
          <h4>Historial de servicios</h4>
          <div className="grid-4">
            <select value={tipo} onChange={e => setTipo(e.target.value)}>
              <option>Cambio de aceite</option>
              <option>Filtro de aceite</option>
              <option>Rotación</option>
              <option>Filtro de aire</option>
              <option>Pastillas de freno</option>
              <option>Líquido de frenos</option>
              <option>Filtro cabina</option>
              <option>Bujías</option>
              <option>Coolant</option>
              <option>Revisión general</option>
              <option>OBD-II</option>
            </select>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            <input
              type="number"
              placeholder="Km (si vacío usa odómetro actual)"
              value={km}
              onChange={e => setKm(e.target.value ? Number(e.target.value) : "")}
            />
            <input placeholder="Notas (opcional)" value={notas} onChange={e => setNotas(e.target.value)} />
            <button className="btn" onClick={onAgregarServicio} disabled={!vehSel}>Agregar</button>
          </div>

          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Servicio</th><th>Fecha</th><th>Km</th><th>Notas</th><th></th>
                </tr>
              </thead>
              <tbody>
                {servicios.map(s => (
                  <tr key={s.id}>
                    <td>{s.service_type}</td>
                    <td>{s.date ?? "—"}</td>
                    <td>{fmt(s.km)}</td>
                    <td>{s.notes ?? "—"}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => onEliminarServicio(s.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {!servicios.length && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", opacity: .7 }}>Sin datos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
