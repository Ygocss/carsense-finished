// frontend/src/pages/Historial.tsx
import { useEffect, useMemo, useState } from "react";
import { getVehicles, listServices } from "../api/client";

type Vehicle = {
  id: number;
  make: string;
  model: string;
  year: number;
  odometer_km?: number;
};

type Service = {
  id: number;
  vehicle_id: number;
  service_type: string;
  date: string | null;
  km: number;
  notes?: string | null;
};

// ---------- utils ----------
const fmt = (n?: number) => new Intl.NumberFormat("es-MX").format(n ?? 0);
const toLocalDate = (d: Date) => {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
};
const today = () => toLocalDate(new Date());

// ---------- recordatorios (solo front) ----------
type Reminder = {
  id: string;
  vehicle_id: number;
  title: string;
  due_date?: string; // YYYY-MM-DD
  due_km?: number;
  created_at: string; // YYYY-MM-DD
};
const REM_KEY = "carsense.reminders";
const loadRems = (): Reminder[] => {
  try { return JSON.parse(localStorage.getItem(REM_KEY) || "[]"); }
  catch { return []; }
};
const saveRems = (rs: Reminder[]) => localStorage.setItem(REM_KEY, JSON.stringify(rs));

export default function Historial() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehSel, setVehSel] = useState<number | "all">("all");
  const [services, setServices] = useState<Service[]>([]);

  // filtros
  const [q, setQ] = useState("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  // recordatorios
  const [rems, setRems] = useState<Reminder[]>([]);

  // cargar vehículos
  useEffect(() => {
    (async () => {
      const vs = (await getVehicles()) || [];
      setVehicles(vs);
      if (vs.length && vehSel === "all") setVehSel(vs[0].id);
    })();
  }, []);

  // cargar servicios del vehículo seleccionado
  useEffect(() => {
    (async () => {
      if (vehSel === "all") { setServices([]); return; }
      const arr = (await listServices(vehSel)) as Service[];
      const normalized = (arr || []).map(s => ({
        ...s,
        date: s.date ?? null,
        km: Number(s.km ?? 0),
      }));
      setServices(normalized);
    })();
  }, [vehSel]);

  // cargar recordatorios
  useEffect(() => { setRems(loadRems()); }, []);
  useEffect(() => { saveRems(rems); }, [rems]);

  // datos del vehículo actual
  const vNow = useMemo(
    () => (vehSel === "all" ? null : vehicles.find(v => v.id === vehSel) || null),
    [vehSel, vehicles]
  );

  // aplicar filtros
  const filtered = useMemo(() => {
    let rows = services.slice().sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
    if (q.trim()) {
      const t = q.toLowerCase();
      rows = rows.filter(r =>
        r.service_type.toLowerCase().includes(t) ||
        (r.notes || "").toLowerCase().includes(t)
      );
    }
    if (from) rows = rows.filter(r => !r.date || r.date >= from ? true : false);
    if (to)   rows = rows.filter(r => !r.date || r.date <= to   ? true : false);
    return rows;
  }, [services, q, from, to]);

  // resumen por tipo
  const summary = useMemo(() => {
    const map = new Map<string, { count: number; last: string | null; kmAvg?: number }>();
    const kmByType = new Map<string, number[]>();
    for (const s of filtered) {
      const m = map.get(s.service_type) || { count: 0, last: null };
      m.count += 1;
      if (s.date && (!m.last || s.date > m.last)) m.last = s.date;
      map.set(s.service_type, m);

      const arr = kmByType.get(s.service_type) || [];
      arr.push(Number(s.km || 0));
      kmByType.set(s.service_type, arr);
    }
    for (const [k, arr] of kmByType) {
      const avg = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : undefined;
      const item = map.get(k)!;
      item.kmAvg = avg;
    }
    return Array.from(map.entries())
      .sort((a, b) => (b[1].count - a[1].count) || (String(b[1].last ?? "").localeCompare(String(a[1].last ?? ""))));
  }, [filtered]);

  // exportar
  function toCSV(rows: Service[]) {
    const header = ["id", "vehicle_id", "service_type", "date", "km", "notes"].join(",");
    const escape = (s: any) => {
      const v = (s ?? "").toString().replace(/"/g, '""');
      return `"${v}"`;
    };
    const body = rows.map(r =>
      [r.id, r.vehicle_id, r.service_type, r.date ?? "", r.km ?? "", r.notes ?? ""]
        .map(escape).join(",")
    ).join("\n");
    return header + "\n" + body;
  }
  function download(filename: string, text: string, mime = "text/plain;charset=utf-8") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }
  function exportCSV() {
    const name = vNow ? `${vNow.make}_${vNow.model}_${vNow.year}` : "vehiculo";
    download(`historial_${name}.csv`, toCSV(filtered), "text/csv;charset=utf-8");
  }
  function exportJSON() {
    const name = vNow ? `${vNow.make}_${vNow.model}_${vNow.year}` : "vehiculo";
    download(`historial_${name}.json`, JSON.stringify(filtered, null, 2), "application/json");
  }

  // limpiar recordatorios vencidos (por fecha pasada y/o km superado)
  function clearExpiredReminders() {
    if (!vNow) { setRems([]); return; }
    const odo = vNow.odometer_km ?? 0;
    const todayStr = today();
    setRems(prev =>
      prev.filter(r => r.vehicle_id !== vNow.id ||
        ((r.due_date ? r.due_date >= todayStr : true) &&
         (r.due_km != null ? r.due_km > odo : true)))
    );
  }
  function removeReminder(id: string) {
    setRems(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div className="container" style={{ display: "grid", gap: 18, paddingTop: 18 }}>
      <div className="panel">
        <h1>Historial</h1>
        <div className="muted">
          Consulta y exporta los registros de mantenimiento. Los recordatorios se guardan localmente.
        </div>
      </div>

      {/* Controles */}
      <div className="panel" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={vehSel}
            onChange={(e) => setVehSel(e.target.value === "all" ? "all" : Number(e.target.value))}
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model} — {v.year} ({fmt(v.odometer_km)} km)
              </option>
            ))}
          </select>

          <input
            className="input"
            placeholder="Buscar: aceite, frenos, notas…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 220 }}
          />

          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="muted">a</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={exportCSV}>Exportar CSV</button>
            <button className="btn" onClick={exportJSON}>Exportar JSON</button>
            <button className="btn btn--ghost" onClick={() => window.print()}>Imprimir</button>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Resumen</h3>
        {vNow ? (
          <>
            <div className="muted">
              Vehículo: <b>{vNow.make} {vNow.model}</b> — {vNow.year} · Odómetro: <b>{fmt(vNow.odometer_km)} km</b>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginTop: 10 }}>
              <div className="stat">
                <div className="stat__value">{fmt(filtered.length)}</div>
                <div className="stat__label">Servicios registrados</div>
              </div>
              <div className="stat">
                <div className="stat__value">{summary.length ? summary[0][1].last ?? "—" : "—"}</div>
                <div className="stat__label">Último servicio (más reciente)</div>
              </div>
              <div className="stat">
                <div className="stat__value">{summary.length ? summary[0][0] : "—"}</div>
                <div className="stat__label">Tipo más frecuente</div>
              </div>
            </div>

            {summary.length > 0 && (
              <div style={{ overflowX: "auto", marginTop: 12 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Servicio</th><th>Veces</th><th>Último</th><th>Km promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map(([name, info]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>{fmt(info.count)}</td>
                        <td>{info.last ?? "—"}</td>
                        <td>{info.kmAvg != null ? fmt(info.kmAvg) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="muted">Selecciona un vehículo para ver su resumen.</div>
        )}
      </div>

      {/* Tabla de servicios */}
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Servicios</h3>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table className="table">
            <thead>
              <tr>
                <th>#</th><th>Servicio</th><th>Fecha</th><th>Km</th><th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr key={s.id ?? idx}>
                  <td>{idx + 1}</td>
                  <td>{s.service_type}</td>
                  <td>{s.date ?? "—"}</td>
                  <td>{fmt(s.km)}</td>
                  <td>{s.notes ?? "—"}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", opacity: .7 }}>Sin datos</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recordatorios (local) */}
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Recordatorios</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn--ghost" onClick={clearExpiredReminders}>
              Limpiar vencidos
            </button>
          </div>
        </div>

        {vNow ? (
          <>
            <div className="muted">Mostrando recordatorios del vehículo seleccionado.</div>
            <ul className="spec__list" style={{ marginTop: 8 }}>
              {rems.filter(r => r.vehicle_id === vNow.id).map(r => (
                <li key={r.id} style={{ marginBottom: 6 }}>
                  <span className="badge">{r.title}</span>{" "}
                  {r.due_date ? `· para ${r.due_date}` : ""}{r.due_date && r.due_km ? " · " : ""}
                  {r.due_km ? `~${fmt(r.due_km)} km` : ""}{" "}
                  <span className="muted"> (creado {r.created_at})</span>
                  <button className="btn btn--mini btn--ghost" style={{ marginLeft: 8 }} onClick={() => removeReminder(r.id)}>
                    Quitar
                  </button>
                </li>
              ))}
              {rems.filter(r => r.vehicle_id === vNow.id).length === 0 && (
                <li className="muted">No hay recordatorios guardados.</li>
              )}
            </ul>
          </>
        ) : (
          <div className="muted">Selecciona un vehículo para ver sus recordatorios.</div>
        )}
      </div>
    </div>
  );
}
