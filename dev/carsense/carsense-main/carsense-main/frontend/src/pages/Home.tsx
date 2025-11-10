import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getVehicles, listServices } from "../api/client";
import type { Vehicle as ApiVehicle, Service as ApiService } from "../api/client";

// Usa tipos del cliente y solo extiende lo que necesitas para KPIs
type Vehicle = ApiVehicle & { next_service_km?: number | null };
type Service = ApiService;

export default function Home() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vehiculos, setVehiculos] = useState<Vehicle[]>([]);
  const [servicios, setServicios] = useState<Service[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [vs, ss] = await Promise.all([getVehicles(), listServices()]);
        if (!alive) return;
        setVehiculos((vs ?? []) as Vehicle[]);
        setServicios((ss ?? []) as Service[]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const kpis = useMemo(() => {
    const base = 8000;
    const pendientes = vehiculos.filter(
      (v) => (v.odometer_km ?? 0) >= ((v.next_service_km ?? base) - 1000)
    ).length;
    const alertas = vehiculos.filter(
      (v) => (v.odometer_km ?? 0) >= (v.next_service_km ?? base)
    ).length;
    return {
      vehiculos: vehiculos.length,
      registros: servicios.length,
      pendientes,
      alertas,
    };
  }, [vehiculos, servicios]);

  const fmt = (n: number) => new Intl.NumberFormat("es-MX").format(n);

  return (
    <div className="home-root">
      {/* HERO */}
      <section className="hero">
        <div className="container hero__content">
          <div className="hero__text">
            <span className="pill">CarSense</span>
            <h1>
              Bienvenido a <span className="brand">CarSense</span>
            </h1>
            <p className="muted">
              Controla el mantenimiento de tu coche, aprende educación vial y guarda tu historial en un solo lugar.
              Claro y visual.
            </p>

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn btn--primary" onClick={() => nav("/mantenimiento")}>
                Ir a Mantenimiento
              </button>
              <Link to="/education" className="btn btn--ghost">
                Reglamento básico
              </Link>
            </div>

            <ul className="hero__bullets">
              <li>Recordatorios simples</li>
              <li>Servicios configurables</li>
              <li>Guías de conducción</li>
            </ul>
          </div>

          <aside className="panel hero__card">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <h3 style={{ margin: 0 }}>Resumen rápido</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <Link to="/mantenimiento" className="btn btn--mini">
                  + Registro
                </Link>
                <Link to="/historial" className="btn btn--mini btn--ghost">
                  Ver todo
                </Link>
              </div>
            </div>

            <div className="stats">
              <div className="stat">
                <div className="stat__value">{loading ? "…" : fmt(kpis.vehiculos)}</div>
                <div className="stat__label">Vehículos</div>
              </div>
              <div className="stat">
                <div className="stat__value">{loading ? "…" : fmt(kpis.registros)}</div>
                <div className="stat__label">Registros</div>
              </div>
              <div className="stat">
                <div className="stat__value">{loading ? "…" : fmt(kpis.pendientes)}</div>
                <div className="stat__label">Pendientes servicio</div>
              </div>
              <div className="stat">
                <div className="stat__value">{loading ? "…" : fmt(kpis.alertas)}</div>
                <div className="stat__label">Alertas</div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ACCIONES RÁPIDAS */}
      <section style={{ marginTop: 16 }}>
        <div className="container panel quick">
          <h3>Acciones rápidas</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="chip" to="/mantenimiento#agregar">
              Agregar vehículo
            </Link>
            <Link className="chip" to="/mantenimiento#servicio">
              Nuevo servicio
            </Link>
            <Link className="chip" to="/mantenimiento#plus1000">
              + 1000 km
            </Link>
            <Link className="chip" to="/historial">
              Exportar historial
            </Link>
          </div>
        </div>

        <div className="container grid">
          <Link to="/mantenimiento#servicio" className="panel feature">
            <div className="feature__icon">🛠️</div>
            <div className="feature__title">Mantenimiento preventivo</div>
            <div className="feature__desc">
              Control de aceite, rotación, frenos y más con recordatorios sencillos.
            </div>
            <span className="feature__cta">Abrir →</span>
          </Link>

          <Link to="/education" className="panel feature">
            <div className="feature__icon">🚦</div>
            <div className="feature__title">Educación vial</div>
            <div className="feature__desc">
              Reglamento básico y buenas prácticas para manejar más seguro.
            </div>
            <span className="feature__cta">Abrir →</span>
          </Link>

          <Link to="/historial" className="panel feature">
            <div className="feature__icon">📑</div>
            <div className="feature__title">Historial de servicios</div>
            <div className="feature__desc">
              Guarda cada servicio y consulta tu registro completo.
            </div>
            <span className="feature__cta">Abrir →</span>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="container cta__content">
          <h4 style={{ margin: 0 }}>¿Listo para poner tu auto al día?</h4>
          <p className="muted" style={{ margin: "6px 0 12px" }}>
            Empieza registrando tu primer servicio en menos de 30 segundos.
          </p>
          <button className="btn btn--primary" onClick={() => nav("/mantenimiento")}>
            Comenzar
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section className="container faq">
        <details>
          <summary>¿Qué guarda CarSense?</summary>
          <p>
            Vehículos, servicios realizados, odómetro y próximos servicios para recordarte a tiempo.
          </p>
        </details>
        <details>
          <summary>¿Puedo exportar mi historial?</summary>
          <p>
            Sí, desde Mantenimiento → “Exportar historial” puedes obtener tu registro completo.
          </p>
        </details>
        <details>
          <summary>¿Necesito crear cuenta?</summary>
          <p>No por ahora. Todo es local y sin fines de lucro.</p>
        </details>
      </section>
    </div>
  );
}
