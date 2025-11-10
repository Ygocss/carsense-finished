// frontend/src/pages/Vehicles.tsx
import { useEffect, useMemo, useState } from "react";
import { listVehicles, createVehicle, updateVehicle, nextServices } from "../api/vehicles";
import { listRecordsByVehicle, createRecord } from "../api/serviceRecords";
import type { Vehicle, ServiceRecord, NextServiceItem } from "../types";

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [next, setNext] = useState<NextServiceItem[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const vActive = useMemo(
    () => vehicles.find(v => v.id === active) ?? null,
    [vehicles, active]
  );

  function showToast(t: string) {
    setToast(t);
    setTimeout(() => setToast(""), 1600);
  }

  async function safe<T>(fn: () => Promise<T>) {
    try {
      setErr("");
      return await fn();
    } catch (e: any) {
      console.error("UI Vehicles ERROR:", e);
      setErr(String(e?.message || e));
    }
  }

  async function refreshAll(selectId?: number) {
    setLoading(true);

    const vs = await safe(() => listVehicles());
    if (!vs) { setLoading(false); return; }

    setVehicles(vs);
    const id = selectId ?? (vs[0]?.id ?? null);
    setActive(id);

    if (id) {
      const ns = await safe(() => nextServices(id));
      if (ns?.items) setNext(ns.items);

      const rs = await safe(() => listRecordsByVehicle(id));
      if (rs) setRecords(rs);
    } else {
      setNext([]);
      setRecords([]);
    }

    setLoading(false);
  }

  useEffect(() => { refreshAll().catch(() => {}); }, []);

  async function plus1000() {
    if (!vActive) return;
    const up = await safe(() =>
      updateVehicle(vActive.id, { current_km: (vActive.current_km ?? 0) + 1000 }) // <-- current_km
    );
    if (!up) return;
    setVehicles(vs => vs.map(v => v.id === up.id ? up : v));
    const ns = await safe(() => nextServices(up.id));
    if (ns?.items) setNext(ns.items);
    showToast("+1000 km");
  }

  async function onCreateVehicle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;     // evitar null después de awaits
    const f = new FormData(form);

    const marca = f.get("marca")?.toString().trim() || "";
    const modelo = f.get("modelo")?.toString().trim() || "";
    const anio = Number(f.get("anio") || 0);
    const current_km = Number(f.get("current_km") || 0);
    const oil_change_km = Number(f.get("oil_change_km") || 5000);
    const rotation_km = Number(f.get("rotation_km") || 10000);

    if (!marca || !modelo || !anio) {
      setErr("Completa marca, modelo y año");
      return;
    }

    const payload: Omit<Vehicle, "id"> = {
      marca,
      modelo,
      anio,
      current_km,
      oil_change_km,
      rotation_km,
    };

    const v = await safe(() => createVehicle(payload));
    if (!v) return;

    await refreshAll(v.id);
    form.reset();                     // seguro
    showToast("Vehículo agregado");
  }

  async function onCreateRecord(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!vActive) return;
    const form = e.currentTarget;
    const f = new FormData(form);

    const payload: Omit<ServiceRecord, "id"> = {
      vehicle_id: vActive.id,
      servicio: String(f.get("servicio") || "aceite"),
      fecha: String(f.get("fecha") || ""),
      km: Number(f.get("km") || 0),
      notas: String(f.get("notas") || ""),
    };

    const rec = await safe(() => createRecord(payload));
    if (!rec) return;

    setRecords(rs => [rec, ...rs]);
    const ns = await safe(() => nextServices(vActive.id));
    if (ns?.items) setNext(ns.items);

    form.reset();
    showToast("Registro agregado");
  }

  return (
    <div className="container" style={{ display: "grid", gap: 16, paddingTop: 8 }}>
      <div style={{
        position: "fixed", top: 8, left: 8, zIndex: 9999,
        background: "#111a", color: "#eaf2ff",
        padding: "6px 8px", border: "1px solid #2b3a55",
        borderRadius: 6, fontSize: 12
      }}>
        <div>dbg · v={vehicles.length} · active={String(active)} · next={next.length} · rec={records.length}</div>
        {loading && <div>loading…</div>}
        {err && <div style={{ color: "#ffb4b4" }}>err: {err}</div>}
      </div>

      <div className="panel">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <div className="badge">Vehículos: <b>{vehicles.length}</b></div>
            <div className="badge">Registros: <b>{records.length}</b></div>
            <div className="badge">Próximos: <b>{next.length}</b></div>
          </div>

          <div className="row" style={{ gap: 8 }}>
            <select className="select" value={active ?? ""} onChange={e => setActive(Number(e.target.value))}>
              <option value="" disabled>Selecciona vehículo</option>
              {vehicles.map(v =>
                <option key={v.id} value={v.id}>
                  {v.marca} {v.modelo} · {v.anio}
                </option>
              )}
            </select>
            <button onClick={plus1000} disabled={!vActive}>+1000 km</button>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Agregar vehículo</h3>
        <form onSubmit={onCreateVehicle} className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input className="input" name="marca" placeholder="Marca" style={{ flex: "1 1 160px" }} required />
          <input className="input" name="modelo" placeholder="Modelo" style={{ flex: "1 1 160px" }} required />
          <input className="input" name="anio" type="number" placeholder="Año" style={{ width: 120 }} required />
          <input className="input" name="current_km" type="number" placeholder="Odómetro (km)" style={{ width: 160 }} required />
          <input className="input" name="oil_change_km" type="number" placeholder="Aceite c/ (km)" style={{ width: 140 }} defaultValue={5000} />
          <input className="input" name="rotation_km" type="number" placeholder="Rotación c/ (km)" style={{ width: 140 }} defaultValue={10000} />
          <button type="submit">Guardar</button>
        </form>
      </div>

      <div className="panel">
        <h3>Próximos servicios</h3>
        {!vActive ? (
          <div className="muted">Selecciona un vehículo</div>
        ) : !next.length ? (
          <div className="muted">Sin datos</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Km restantes</th>
                <th>Días restantes</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {next.map((n, i) => (
                <tr key={i}>
                  <td>{n.service}</td>
                  <td>{n.remaining_km ?? "—"}</td>
                  <td>{n.remaining_days ?? "—"}</td>
                  <td>{n.due ? "Vencido" : "En curso"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <h3>Historial de servicios</h3>
          <form onSubmit={onCreateRecord} className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <select className="select" name="servicio" required>
              <option value="aceite">Cambio de aceite</option>
              <option value="rotacion">Rotación de llantas</option>
              <option value="filtro">Cambio de filtro</option>
              <option value="frenos">Frenos</option>
            </select>
            <input className="input" type="date" name="fecha" required />
            <input className="input" type="number" name="km" placeholder="Km" required />
            <input className="input" type="text" name="notas" placeholder="Notas (opcional)" style={{ minWidth: 220 }} />
            <button type="submit" disabled={!vActive}>Agregar</button>
          </form>
        </div>

        {!vActive ? (
          <div className="muted">Selecciona un vehículo</div>
        ) : !records.length ? (
          <div className="muted">Aún no tienes registros</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Fecha</th>
                <th>Km</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td>{r.servicio}</td>
                  <td>{r.fecha}</td>
                  <td>{(r.km ?? 0).toLocaleString()}</td>
                  <td>{r.notas || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!!toast && (
        <div style={{
          position: "fixed", right: 16, bottom: 16,
          background: "#1f2a3a", color: "#eaf2ff",
          padding: "10px 14px", borderRadius: 8, border: "1px solid #2b3a55"
        }}>{toast}</div>
      )}
    </div>
  );
}
