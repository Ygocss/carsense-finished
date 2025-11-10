import React, { useEffect, useState } from "react";
import { listAlerts, runAlertsNow, type Alert } from "../api/alerts";

export default function AlertsPage() {
  const [items, setItems] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const data = await listAlerts();
      setItems(data);
    } catch (e: any) {
      console.error("listAlerts error:", e);
      setError(e?.message ?? "Error al cargar alertas");
    } finally {
      setLoading(false);
    }
  }

  async function handleRunNow(e?: React.MouseEvent) {
    e?.preventDefault();
    try {
      setRunning(true);
      setError(null);
      console.log("[UI] POST /alerts/run-now");
      await runAlertsNow();
      await refresh();
    } catch (e: any) {
      console.error("runAlertsNow error:", e);
      setError(e?.message ?? "No se pudieron generar alertas");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h2>Alertas</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={refresh} disabled={loading || running}>
          {loading ? "Actualizando..." : "Refrescar"}
        </button>
        <button onClick={handleRunNow} disabled={loading || running}>
          {running ? "Generando..." : "Generar alertas ahora"}
        </button>
      </div>

      {error && (
        <div style={{ color: "white", background: "#c0392b", padding: 8, borderRadius: 6, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Cargando…</p>
      ) : items.length === 0 ? (
        <p style={{ opacity: 0.8 }}>No hay alertas aún.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Vehículo</th>
                <th style={th}>Servicio</th>
                <th style={th}>Fecha programada</th>
                <th style={th}>Estado</th>
                <th style={th}>Creada</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td style={td}>{a.id}</td>
                  <td style={td}>{a.vehicle_id}</td>
                  <td style={td}>{a.servicio}</td>
                  <td style={td}>{a.fecha_programada}</td>
                  <td style={td}>{a.estado}</td>
                  <td style={td}>{new Date(a.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px", background: "#f6f8fa" };
const td: React.CSSProperties = { borderBottom: "1px solid #eee", padding: "8px 6px" };
