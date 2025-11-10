import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type Categoria = "Aceites" | "Filtros" | "Frenos" | "Motor" | "Refrigeración" | "Otros";

type Product = {
  id: number;
  nombre: string;
  categoria: Categoria;
  desc: string;
  intervalo_km?: number;
  intervalo_meses?: number;
  specs?: Record<string, string | number>;
  compatible?: string[];
  tips?: string[];
  icon?: string;
  precio_aprox?: string;
};

const productosBase: Product[] = [
  { id: 1, nombre: "Aceite 5W-30", categoria: "Aceites",
    desc: "Protección a alta temperatura para motores modernos.",
    intervalo_km: 8000, intervalo_meses: 6,
    specs: { Base: "Sintético", API: "SP", ACEA: "A5/B5" },
    compatible: ["Toyota 1.6–2.0L", "Nissan 1.6–2.0L", "GM 1.4T/1.8"],
    tips: ["Calienta 2–3 min antes de medir", "Cambia filtro en cada servicio"],
    icon: "🛢️", precio_aprox: "$300–$650 / litro" },
  { id: 2, nombre: "Aceite 0W-20", categoria: "Aceites",
    desc: "Baja fricción y mejor arranque en frío.",
    intervalo_km: 8000, intervalo_meses: 6,
    specs: { Base: "Sintético", API: "SP", OEM: "Honda/Toyota 0W-20" },
    compatible: ["Honda i-VTEC", "Toyota VVT-i"],
    tips: ["Respeta la viscosidad del manual"], icon: "🧊",
    precio_aprox: "$350–$750 / litro" },
  { id: 3, nombre: "Filtro de aceite", categoria: "Filtros",
    desc: "Retiene impurezas del motor.",
    intervalo_km: 8000, intervalo_meses: 6,
    specs: { Micras: "20–30 μm", Válvula: "Antirretorno" },
    compatible: ["Roscas M20x1.5 / 3/4-16"], tips: ["Lubrica la junta antes de montar"],
    icon: "🧰", precio_aprox: "$120–$300" },
  { id: 4, nombre: "Filtro de aire", categoria: "Filtros",
    desc: "Mejor combustión y cuidado del MAF.",
    intervalo_km: 12000, intervalo_meses: 12,
    specs: { Tipo: "Papel plisado", Micras: "10–20 μm" },
    compatible: ["Caja de aire OEM"], tips: ["Sopla polvo, reemplaza si está saturado"],
    icon: "🌬️", precio_aprox: "$150–$450" },
  { id: 5, nombre: "Pastillas de freno cerámicas", categoria: "Frenos",
    desc: "Menos polvo y ruido; buena mordida en ciudad.",
    intervalo_km: 25000, intervalo_meses: 24,
    specs: { Compuesto: "Cerámico", Indicador: "Sensor/placa" },
    compatible: ["Eje delantero (disco ventilado)"],
    tips: ["Asentar suavemente los primeros 300 km"], icon: "🛑",
    precio_aprox: "$700–$1,800 (juego)" },
  { id: 6, nombre: "Líquido de frenos DOT4", categoria: "Frenos",
    desc: "Mayor punto de ebullición; respuesta más firme.",
    intervalo_km: 40000, intervalo_meses: 24,
    specs: { Húmedo: "155°C", Seco: "230°C" },
    compatible: ["ABS/ESC DOT4"], tips: ["No mezclar con DOT5 (silicona)"],
    icon: "💧", precio_aprox: "$140–$300 (500 ml)" },
  { id: 7, nombre: "Bujías Iridio", categoria: "Motor",
    desc: "Chispa estable y mayor durabilidad.",
    intervalo_km: 60000, intervalo_meses: 48,
    specs: { Electrodo: "Iridio 0.6–0.7 mm", Calor: "Según OEM" },
    compatible: ["Gasolina multipunto/turbo"], tips: ["Respetar torque y luz OEM"],
    icon: "⚡", precio_aprox: "$180–$480 c/u" },
  { id: 8, nombre: "Coolant 50/50", categoria: "Refrigeración",
    desc: "Anticorrosivo y control de temperatura.",
    intervalo_km: 50000, intervalo_meses: 36,
    specs: { Base: "OAT/HOAT", Mezcla: "50% antifreeze" },
    compatible: ["Radiadores aluminio/cobre"], tips: ["No mezclar colores sin purga"],
    icon: "❄️", precio_aprox: "$180–$350 / litro" },
  { id: 9, nombre: "Limpiaparabrisas 22\"", categoria: "Otros",
    desc: "Visibilidad clara en lluvia.",
    intervalo_meses: 12, specs: { Tipo: "Aerodinámico", Anclaje: "U/J hook" },
    compatible: ["Gancho U/J universal"], tips: ["Limpia caucho cada 2 semanas"],
    icon: "🌧️", precio_aprox: "$120–$350 c/u" },
  { id: 10, nombre: "Filtro de cabina (carbón activado)", categoria: "Filtros",
    desc: "Mejor calidad de aire interno y menos olores.",
    intervalo_km: 15000, intervalo_meses: 12,
    specs: { Medio: "Carbón activado", Capa: "HEPA opcional" },
    compatible: ["Caja A/C OEM"], tips: ["Cámbialo antes de temporada de lluvias"],
    icon: "🫧", precio_aprox: "$180–$450" },
  // Extras
  { id: 11, nombre: "Filtro de combustible", categoria: "Filtros",
    desc: "Protege inyectores de impurezas del tanque.",
    intervalo_km: 40000, intervalo_meses: 24,
    specs: { Tipo: "Cartucho/inline", Micras: "5–10 μm" },
    compatible: ["MPI / GDI (según OEM)"], icon: "⛽",
    tips: ["Al cambiar, alivia presión de riel"], precio_aprox: "$300–$900" },
  { id: 12, nombre: "Correa de accesorios", categoria: "Motor",
    desc: "Acciona alternador, bomba de dirección/AC.",
    intervalo_km: 60000, intervalo_meses: 48,
    specs: { Tipo: "Poly-V", Revisar: "Grietas/chirridos" },
    compatible: ["Longitud según OEM"], icon: "🧵",
    tips: ["Revisa tensión y poleas"], precio_aprox: "$350–$900" },
  { id: 13, nombre: "Batería 12V", categoria: "Otros",
    desc: "Arranque y sistema eléctrico estable.",
    intervalo_meses: 36,
    specs: { Tipo: "AGM/EFB/Conv.", CCA: "Según OEM" },
    compatible: ["Autos gasolina/híbridos 12V"], icon: "🔋",
    tips: ["Evita descargas profundas"], precio_aprox: "$1,400–$3,500" },
  { id: 14, nombre: "Llantas all-season 205/55R16", categoria: "Otros",
    desc: "Buen balance agarre/ruido/duración.",
    intervalo_km: 45000, intervalo_meses: 36,
    specs: { UTQG: "Treadwear ~400", Índice: "91V" },
    compatible: ["Rin 16\" 6.5J"], icon: "🛞",
    tips: ["Rotar cada 10–12 mil km"], precio_aprox: "$1,500–$2,400 c/u" },
];

const categorias: Array<Categoria | "Todos"> = ["Todos", "Aceites", "Filtros", "Frenos", "Motor", "Refrigeración", "Otros"];

export default function Products() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof categorias)[number]>("Todos");
  const [sel, setSel] = useState<Product | null>(null);

  const productos = useMemo(() => {
    return productosBase.filter(p => {
      const byCat = cat === "Todos" ? true : p.categoria === cat;
      const text = [p.nombre, p.desc, p.categoria, ...(p.compatible ?? [])].join(" ").toLowerCase();
      const byText = q.trim() ? text.includes(q.toLowerCase()) : true;
      return byCat && byText;
    });
  }, [q, cat]);

  // Cerrar modal con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSel(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fmt = (n: number) => n.toLocaleString("es-MX");

  return (
    <div className="container" style={{ display: "grid", gap: 18, paddingTop: 18 }}>
      {/* Encabezado */}
      <div className="panel">
        <h1 style={{ marginBottom: 6 }}>Productos</h1>
        <div className="muted">Guía base para mantenimiento.</div>

        {/* Controles */}
        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <input
            placeholder="Buscar: 5W-30, filtro, DOT4, bujías…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 260 }}
          />
          <select value={cat} onChange={(e) => setCat(e.target.value as any)}>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn--ghost" onClick={() => { setQ(""); setCat("Todos"); }}>
            Limpiar
          </button>
        </div>
      </div>

      {/* Grid de tarjetas */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14 }}>
        {productos.map((p) => (
          <article key={p.id} className="panel" style={{ display: "grid", gap: 8 }}>
            <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
              <h3 style={{ margin: 0 }}>{p.icon} {p.nombre}</h3>
              <span className="chip">{p.categoria}</span>
            </div>

            <div className="muted">{p.desc}</div>

            {(p.intervalo_km || p.intervalo_meses) && (
              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                {p.intervalo_km ? <span className="badge">Cada ~{fmt(p.intervalo_km)} km</span> : null}
                {p.intervalo_meses ? <span className="badge">Cada ~{p.intervalo_meses} meses</span> : null}
              </div>
            )}

            <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              <button className="btn" onClick={() => setSel(p)}>Ver detalle</button>
              <Link to="/mantenimiento#servicio" className="btn btn--ghost">Añadir recordatorio</Link>
            </div>
          </article>
        ))}
      </div>

      {/* Modal de detalle */}
      {sel && (
        <div className="modal__backdrop" onClick={() => setSel(null)}>
          <div className="modal panel" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "start" }}>
              <h2 style={{ margin: 0 }}>{sel.icon} {sel.nombre}</h2>
              <button className="btn btn--ghost" onClick={() => setSel(null)}>Cerrar</button>
            </div>

            <div className="muted" style={{ marginTop: 6 }}>{sel.desc}</div>

            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div className="panel" style={{ padding: 10 }}>
                <h4 style={{ marginTop: 0 }}>Especificaciones</h4>
                {!sel.specs ? (
                  <div className="muted">—</div>
                ) : (
                  <ul className="spec__list">
                    {Object.entries(sel.specs).map(([k, v]) => (
                      <li key={k}><b>{k}:</b> <span>{String(v)}</span></li>
                    ))}
                  </ul>
                )}
                {sel.precio_aprox && (
                  <div className="muted" style={{ marginTop: 6 }}>
                    Precio aprox: <b>{sel.precio_aprox}</b>
                  </div>
                )}
              </div>

              <div className="panel" style={{ padding: 10 }}>
                <h4 style={{ marginTop: 0 }}>Compatibilidad</h4>
                {!sel.compatible?.length ? (
                  <div className="muted">Consulta catálogo por modelo exacto.</div>
                ) : (
                  <ul className="spec__list">
                    {sel.compatible.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                )}
                {(sel.intervalo_km || sel.intervalo_meses) && (
                  <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    {sel.intervalo_km ? <span className="badge">~{fmt(sel.intervalo_km)} km</span> : null}
                    {sel.intervalo_meses ? <span className="badge">~{sel.intervalo_meses} meses</span> : null}
                  </div>
                )}
              </div>
            </div>

            {sel.tips?.length ? (
              <div className="panel" style={{ padding: 10 }}>
                <h4 style={{ marginTop: 0 }}>Tips</h4>
                <ul className="spec__list">
                  {sel.tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            ) : null}

            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              <Link to="/mantenimiento#servicio" className="btn">Añadir recordatorio</Link>
              <button className="btn btn--ghost" onClick={() => setSel(null)}>Listo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
