import { useEffect, useMemo, useState } from "react";

type Topic = {
  slug: string;
  titulo: string;
  resumen: React.ReactNode;
  chips?: string[];
  // Varias rutas posibles del mismo PDF (evita 404 si el nombre varía)
  pdfCandidates?: string[];
};

const DOC = (file: string) => `/docs/${file}`;

const temasBase: Topic[] = [
  {
    slug: "accidentes",
    titulo: "Costos y magnitud de los siniestros",
    chips: ["INEGI 2018", "Costos sociales", "Salud pública"],
    pdfCandidates: [DOC("imco_costos_siniestros_2018.pdf")],
    resumen: (
      <>
        <p>
          En 2018, México registró <b>≈15,296 muertes por hechos de tránsito</b>
          {" "} (≈42 por día), la <b>9ª causa de muerte</b> nacional (12.2 por 100 mil hab.).
          Los costos incluyen pérdidas de capital humano, gastos médicos y daños materiales.
        </p>
        <p className="text-sm">
          El estudio del IMCO desagrega costos por muertes prematuras, lesiones y daños,
          y propone medidas costo-efectivas alineadas con OMS/ODS.
        </p>
      </>
    ),
  },
  {
    slug: "transito",
    titulo: "Estrategia Nacional de Seguridad Vial",
    chips: ["Ejes prioritarios", "Metas 2030", "OMS/ONU"],
    pdfCandidates: [DOC("estrategia_nacional_seguridad_vial.pdf")],
    resumen: (
      <>
        <p>
          Alinea a México con el Decenio de Acción por la Seguridad Vial. Establece
          metas de reducción de mortalidad, gestión de velocidad, infraestructura segura
          y vehículos con sistemas de seguridad activa y pasiva.
        </p>
        <ul className="list-disc pl-5 text-sm">
          <li>Gestión institucional y datos confiables.</li>
          <li>Vías y entornos que perdonan el error humano.</li>
          <li>Usuarios protegidos: casco, cinturón, SRI, alcohol-cero.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "reglamento",
    titulo: "Reglamento de Movilidad (Jalisco)",
    chips: ["Prioridad peatonal", "Velocidades", "Sanciones"],
    // Soporta nombres alternos:
    pdfCandidates: [
      DOC("reglamento_movilidad_jalisco_2023.pdf"),
      DOC("reglamento_jalisco_1998.pdf"),
      DOC("reglamento_jalisco.pdf"),
    ],
    resumen: (
      <>
        <p>
          Define jerarquías de movilidad, límites de velocidad, reglas de rebase
          y dispositivos de control. Refuerza el enfoque de <b>visión cero</b> y protege
          a usuarios vulnerables.
        </p>
        <p className="text-sm">
          Útil para comprender obligaciones del conductor, señalización y
          procedimientos ante infracciones y siniestros.
        </p>
      </>
    ),
  },
  {
    slug: "infraestructura",
    titulo: "Guía IMT: Seguridad vial en carreteras",
    chips: ["Diseño seguro", "Tratamientos", "Auditorías"],
    // Soporta ambos nombres:
    pdfCandidates: [
      DOC("pt224_seguridad_vial_carreteras.pdf"),
      DOC("imt_pt224_seguridad_vial_carreteras.pdf"),
    ],
    resumen: (
      <>
        <p>
          Publicación técnica del IMT con tratamientos de seguridad, auditorías
          de infraestructura y gestión de puntos de alta siniestralidad. Criterios
          prácticos de bajo costo y alto impacto.
        </p>
      </>
    ),
  },
];

// === utilidades ===
const LS_FAVS = "datos.favoritos";

function loadFavs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_FAVS) || "[]");
  } catch { return []; }
}
function saveFavs(ids: string[]) {
  localStorage.setItem(LS_FAVS, JSON.stringify(ids));
}

async function abrirPrimeraRutaDisponible(paths?: string[]) {
  if (!paths?.length) return alert("No hay PDF configurado para este tema.");
  for (const href of paths) {
    try {
      const res = await fetch(href, { method: "HEAD" });
      if (res.ok) {
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
    } catch { /* ignore */ }
  }
  alert("No se encontró el PDF. Verifica que exista en /public/docs.");
}

export default function Datos() {
  const [activo, setActivo] = useState<Topic | null>(null);
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<string>("Todos");
  const [favs, setFavs] = useState<string[]>(loadFavs());

  // Soporta abrir por query: /datos?t=reglamento
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    if (t) {
      const found = temasBase.find(x => x.slug === t);
      if (found) setActivo(found);
    }
  }, []);

  useEffect(() => saveFavs(favs), [favs]);

  const chipsDisponibles = useMemo(() => {
    const set = new Set<string>();
    temasBase.forEach(t => t.chips?.forEach(c => set.add(c)));
    return ["Todos", ...Array.from(set).sort()];
  }, []);

  const temas = useMemo(() => {
    return temasBase.filter(t => {
      const okQ = q.trim().length === 0
        ? true
        : (t.titulo + " " + (t.chips || []).join(" ")).toLowerCase().includes(q.toLowerCase());
      const okChip = chip === "Todos" ? true : (t.chips || []).includes(chip);
      return okQ && okChip;
    })
    // favoritos primero
    .sort((a, b) => Number(favs.includes(b.slug)) - Number(favs.includes(a.slug)));
  }, [q, chip, favs]);

  const toggleFav = (slug: string) =>
    setFavs(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);

  return (
    <div className="container" style={{ display: "grid", gap: 18, paddingTop: 18 }}>
      <div className="panel">
        <h1>Datos e información</h1>
        <div className="muted">Material base: reglamentos, estrategias y guías técnicas.</div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <input
            placeholder="Buscar: IMCO, reglamento, IMT…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ minWidth: 260 }}
          />
          <select value={chip} onChange={e => setChip(e.target.value)}>
            {chipsDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-3">
        {temas.map((t) => {
          const isFav = favs.includes(t.slug);
          return (
            <div key={t.slug} className="panel" style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <h3 style={{ margin: 0 }}>{t.titulo}</h3>
                <button
                  className="btn btn--ghost"
                  aria-label="favorito"
                  title={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
                  onClick={() => toggleFav(t.slug)}
                >
                  {isFav ? "★" : "☆"}
                </button>
              </div>

              {!!t.chips?.length && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {t.chips.map((c, i) => <span key={i} className="badge">{c}</span>)}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                <button className="btn" onClick={() => setActivo(t)}>Leer resumen</button>
                <button className="btn btn--ghost" onClick={() => abrirPrimeraRutaDisponible(t.pdfCandidates)}>
                  Ver PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {activo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,12,.80)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
            padding: 16,
          }}
          onClick={() => setActivo(null)}
        >
          <div
            className="panel"
            style={{
              maxWidth: 820,
              width: "100%",
              background: "#0b1220",
              border: "1px solid rgba(255,255,255,0.12)",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* header fijo */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>{activo.titulo}</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn--ghost"
                  onClick={() => abrirPrimeraRutaDisponible(activo.pdfCandidates)}
                >
                  Abrir PDF
                </button>
                <button className="btn btn--ghost" onClick={() => setActivo(null)}>Cerrar</button>
              </div>
            </div>

            {/* contenido desplazable */}
            <div style={{ overflowY: "auto", marginTop: 10, paddingRight: 2 }}>
              {!!activo.chips?.length && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {activo.chips.map((c, i) => <span key={i} className="badge">{c}</span>)}
                </div>
              )}
              <div className="muted" style={{ lineHeight: 1.6 }}>{activo.resumen}</div>
              <div style={{ height: 6 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
