import { useEffect, useMemo, useState } from "react";

type Resource = { label: string; href: string };
type Lesson = {
  title: string;
  body: React.ReactNode;
  tips?: string[];
  resources?: Resource[];
};
type QuizQ = { q: string; options: string[]; answer: number };
type Module = {
  id: string;
  title: string;
  icon?: string;
  lessons: Lesson[];
  checklist?: string[];
  quiz?: QuizQ[];
};

type Progress = {
  step: number;
  checks: number[];
  answers: number[]; // -1 = sin responder
  done: boolean;
};

// Helper para rutas de PDF en /public/docs
const DOC = (file: string) => `/docs/${file}`;

const MODULES: Module[] = [
  {
    id: "oil",
    title: "Cambio de aceite",
    icon: "🛢️",
    lessons: [
      {
        title: "¿Por qué cambiarlo?",
        body: (
          <>
            <p>
              El aceite lubrica, refrigera y limpia. Con el tiempo pierde
              propiedades por temperatura y contaminación. Cambiarlo a tiempo
              previene desgaste y consumo alto.
            </p>
          </>
        ),
        tips: ["Respeta viscosidad (ej. 5W-30) del manual.", "Cambiar filtro SIEMPRE."],
        resources: [{ label: "Guía rápida (IMCO, PDF)", href: DOC("imco_costos_siniestros_2018.pdf") }],
      },
      {
        title: "Cuándo cambiar",
        body: (
          <>
            <p>
              Revisa el plan de mantenimiento. Como regla general:{" "}
              <b>cada 8–12 mil km o 6–12 meses</b> (lo que ocurra primero).
            </p>
          </>
        ),
        tips: ["Trayectos cortos = cambios más frecuentes.", "Usa recordatorios por km/fecha."],
      },
      {
        title: "Qué necesitas",
        body: (
          <>
            <ul className="list-disc pl-5">
              <li>Llave para tapón, charola, embudo.</li>
              <li>Filtro nuevo, arandela, aceite recomendado.</li>
              <li>Guantes y cuidado con el motor caliente.</li>
            </ul>
          </>
        ),
      },
    ],
    checklist: [
      "Motor tibio, coche nivelado",
      "Retira tapón y drena",
      "Cambia filtro y arandela",
      "Coloca tapón al par adecuado",
      "Rellena aceite y verifica nivel",
      "Registra km y fecha",
    ],
    quiz: [
      { q: "¿Qué ocurre primero para decidir el cambio?", options: ["Sólo los km", "Km o tiempo (lo primero)", "Sólo el tiempo"], answer: 1 },
      { q: "¿Se cambia el filtro en cada servicio?", options: ["Sí", "No, sólo a veces", "Nunca"], answer: 0 },
      { q: "¿La viscosidad se elige cómo?", options: ["Por moda", "Por manual del fabricante", "Por el mecánico siempre"], answer: 1 },
    ],
  },
  {
    id: "obd",
    title: "OBD-II básico",
    icon: "🧰",
    lessons: [
      {
        title: "¿Qué es OBD-II?",
        body: (
          <p>
            Es el sistema de diagnóstico a bordo que registra fallas y permite
            leer códigos (DTC). Un escáner Bluetooth + app puede mostrar datos
            de motor, sensores y borrar códigos (con criterio).
          </p>
        ),
        resources: [
          { label: "Estrategia Nacional (PDF)", href: DOC("estrategia_nacional_seguridad_vial.pdf") },
          { label: "PT 224 Seguridad Vial (PDF)", href: DOC("pt224_seguridad_vial_carreteras.pdf") },
        ],
      },
      {
        title: "Conector y lectura",
        body: (
          <p>
            El conector suele estar bajo el tablero. Enciende contacto, enlaza el
            escáner, abre la app y lee DTC. Anota los códigos y consulta su
            significado antes de borrar.
          </p>
        ),
        tips: ["Borrar sin reparar ≠ resolver.", "Guarda capturas de los DTC."],
      },
    ],
    checklist: [
      "Localicé el conector OBD-II",
      "Enlace correcto con app",
      "Leí y anoté DTC",
      "Busqué significado de códigos",
    ],
    quiz: [
      { q: "OBD-II sirve para…", options: ["Navegar", "Diagnóstico de fallas", "Ajustar espejos"], answer: 1 },
      { q: "¿Borrar códigos resuelve el problema?", options: ["Siempre", "No necesariamente", "Nunca lee"], answer: 1 },
      { q: "¿Dónde está el conector?", options: ["Bajo tablero (común)", "En la llanta", "En el espejo retrovisor"], answer: 0 },
    ],
  },
  {
    id: "trip",
    title: "Checklist de viaje",
    icon: "🧭",
    lessons: [
      {
        title: "Antes de salir",
        body: (
          <ul className="list-disc pl-5">
            <li>Llantas y refacción (presión/estado)</li>
            <li>Luces, frenos y limpiaparabrisas</li>
            <li>Nivel de aceite, refrigerante y líquido de frenos</li>
          </ul>
        ),
      },
      {
        title: "Documentos y seguridad",
        body: (
          <ul className="list-disc pl-5">
            <li>Licencia, tarjeta, seguro</li>
            <li>Kit: triángulos, gato, llave cruz, botiquín</li>
            <li>Plan de ruta y descansos</li>
          </ul>
        ),
        resources: [
          { label: "Reglamento Jalisco 1998 (PDF)", href: DOC("reglamento_jalisco_1998.pdf") },
          { label: "Reglamento Movilidad 2023 (PDF)", href: DOC("reglamento_movilidad_jalisco_2023.pdf") },
        ],
      },
    ],
    checklist: [
      "Neumáticos y refacción revisados",
      "Fluidos OK (aceite, refrigerante, frenos)",
      "Luces y limpiaparabrisas OK",
      "Kit de emergencia listo",
      "Documentos a la mano",
    ],
    quiz: [
      { q: "¿Qué fluido NO debes olvidar?", options: ["Refrigerante", "Tinta de impresora", "Champú"], answer: 0 },
      { q: "Elemento esencial del kit:", options: ["Triángulos y botiquín", "Dulces", "Pelota"], answer: 0 },
      { q: "Conviene planear…", options: ["Descansos", "Chismes", "Fotos de memes"], answer: 0 },
    ],
  },
];

const LS_KEY = "academy.progress";

function loadProgress(): Record<string, Progress> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
function saveProgress(map: Record<string, Progress>) {
  localStorage.setItem(LS_KEY, JSON.stringify(map));
}

export default function Academia() {
  const [open, setOpen] = useState<Module | null>(null);
  const [map, setMap] = useState<Record<string, Progress>>({});

  useEffect(() => setMap(loadProgress()), []);
  useEffect(() => saveProgress(map), [map]);

  const progressPct = (m: Module) => {
    const p = map[m.id];
    if (!p) return 0;
    const lessonsPart = Math.min(1, (p.step + 1) / m.lessons.length);
    const checkPart = m.checklist?.length ? (p.checks.length || 0) / m.checklist.length : 1;
    const quizPart = m.quiz?.length ? (p.answers.filter(a => a >= 0).length || 0) / m.quiz.length : 1;
    return Math.round(100 * (0.5 * lessonsPart + 0.25 * checkPart + 0.25 * quizPart));
  };

  const startModule = (m: Module) => {
    setMap(prev => {
      if (prev[m.id]) return prev;
      return {
        ...prev,
        [m.id]: {
          step: 0,
          checks: [],
          answers: m.quiz ? Array(m.quiz.length).fill(-1) : [],
          done: false,
        },
      };
    });
    setOpen(m);
  };

  const continueModule = (m: Module) => setOpen(m);

  return (
    <div className="container" style={{ display: "grid", gap: 18, paddingTop: 18 }}>
      <div className="panel">
        <h1>Academia CarSense</h1>
        <div className="muted">Rutas de aprendizaje cortas y prácticas.</div>
      </div>

      <div className="grid grid-3">
        {MODULES.map((m) => {
          const pct = progressPct(m);
          const has = !!map[m.id];
          return (
            <div key={m.id} className="panel" style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 38 }}>{m.icon ?? "📘"}</div>
              <h3 style={{ marginBottom: 6 }}>{m.title}</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className="badge">Lecciones {m.lessons.length}</span>
                {m.checklist?.length ? <span className="badge">Checklist</span> : null}
                {m.quiz?.length ? <span className="badge">Quiz</span> : null}
              </div>
              <div className="muted">Progreso: <b>{pct}%</b></div>
              <div style={{ height: 6 }} />
              <div style={{ display: "flex", gap: 8 }}>
                {!has ? (
                  <button className="btn" onClick={() => startModule(m)}>Comenzar</button>
                ) : (
                  <button className="btn" onClick={() => continueModule(m)}>Continuar</button>
                )}
                <button
                  className="btn btn--ghost"
                  onClick={() => {
                    setOpen(m);
                    if (!has) startModule(m);
                  }}
                >
                  Ver
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <ModuleModal
          module={open}
          progress={
            map[open.id] ??
            { step: 0, checks: [], answers: open.quiz ? Array(open.quiz.length).fill(-1) : [], done: false }
          }
          onClose={() => setOpen(null)}
          onChange={(p) => setMap(prev => ({ ...prev, [open.id]: p }))}
        />
      )}
    </div>
  );
}

function ModuleModal({
  module,
  progress,
  onChange,
  onClose,
}: {
  module: Module;
  progress: Progress;
  onChange: (p: Progress) => void;
  onClose: () => void;
}) {
  const step = Math.min(progress.step, module.lessons.length - 1);
  const lesson = module.lessons[step];

  const pct = useMemo(() => {
    const lessonsPart = Math.min(1, (progress.step + 1) / module.lessons.length);
    const checkPart = module.checklist?.length ? (progress.checks.length || 0) / module.checklist.length : 1;
    const quizPart = module.quiz?.length ? (progress.answers.filter(a => a >= 0).length || 0) / module.quiz.length : 1;
    return Math.round(100 * (0.5 * lessonsPart + 0.25 * checkPart + 0.25 * quizPart));
  }, [progress, module]);

  const next = () => onChange({ ...progress, step: Math.min(step + 1, module.lessons.length - 1) });
  const prev = () => onChange({ ...progress, step: Math.max(step - 1, 0) });

  const toggleCheck = (idx: number) => {
    const set = new Set(progress.checks);
    set.has(idx) ? set.delete(idx) : set.add(idx);
    onChange({ ...progress, checks: Array.from(set).sort((a, b) => a - b) });
  };

  const answerQuiz = (qi: number, opt: number) => {
    const arr = [...progress.answers];
    arr[qi] = opt;
    onChange({ ...progress, answers: arr });
  };

  const corrects = module.quiz?.reduce((acc, q, i) => acc + (progress.answers[i] === q.answer ? 1 : 0), 0) ?? 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 6, 12, .88)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 980,
          width: "100%",
          background: "#0e1624",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
          borderRadius: 12,
          /* === CLAVE: alto y scroll interno === */
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header fijo del modal */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 6 }}>
          <h2 style={{ margin: 0 }}>
            {module.icon ?? "📘"} {module.title}
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge">Progreso {pct}%</span>
            <button className="btn btn--ghost" onClick={onClose}>Salir</button>
          </div>
        </div>

        {/* Contenido desplazable */}
        <div style={{ overflowY: "auto", paddingRight: 2 }}>
          {/* Stepper */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {module.lessons.map((l, i) => (
              <button
                key={i}
                className="badge"
                onClick={() => onChange({ ...progress, step: i })}
                style={{
                  borderColor: i === step ? "#6ea8fe" : undefined,
                  boxShadow: i === step ? "0 0 0 1px #6ea8fe inset" : undefined,
                }}
                title={l.title}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div style={{ height: 12 }} />

          {/* Lección */}
          <div className="panel" style={{ background: "#101c2b", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3>{lesson.title}</h3>
            <div className="muted" style={{ lineHeight: 1.6 }}>{lesson.body}</div>

            {lesson.tips && (
              <>
                <div style={{ height: 8 }} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {lesson.tips.map((t, i) => (
                    <span key={i} className="badge">Tip: {t}</span>
                  ))}
                </div>
              </>
            )}

            {lesson.resources && (
              <>
                <div style={{ height: 10 }} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {lesson.resources.map((r, i) => (
                    <button
                      key={i}
                      className="btn btn--ghost"
                      onClick={() => window.open(r.href, "_blank", "noopener,noreferrer")}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Navegación de lecciones */}
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button className="btn btn--ghost" onClick={prev} disabled={step === 0}>← Anterior</button>
            <button className="btn" onClick={next} disabled={step === module.lessons.length - 1}>Siguiente →</button>
          </div>

          {/* Checklist */}
          {module.checklist?.length ? (
            <>
              <div style={{ height: 14 }} />
              <div className="panel" style={{ background: "#101c2b", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h3>Checklist</h3>
                <ul className="list-disc pl-5">
                  {module.checklist.map((item, idx) => {
                    const checked = progress.checks.includes(idx);
                    return (
                      <li key={idx} style={{ marginBottom: 6 }}>
                        <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleCheck(idx)} />
                          <span className={checked ? "muted" : ""}>{item}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          ) : null}

          {/* Quiz */}
          {module.quiz?.length ? (
            <>
              <div style={{ height: 14 }} />
              <div className="panel" style={{ background: "#101c2b", border: "1px solid rgba(255,255,255,0.06)" }}>
                <h3>Quiz</h3>
                <div className="muted">Aciertos: <b>{corrects}</b> / {module.quiz.length}</div>
                <div style={{ height: 8 }} />
                {module.quiz.map((q, qi) => (
                  <div key={qi} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600 }}>{qi + 1}. {q.q}</div>
                    <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                      {q.options.map((opt, oi) => {
                        const chosen = progress.answers[qi];
                        const isCorrect = chosen >= 0 && oi === q.answer;
                        const isWrong = chosen === oi && chosen !== q.answer;
                        return (
                          <button
                            key={oi}
                            className="btn btn--ghost"
                            onClick={() => answerQuiz(qi, oi)}
                            style={{ borderColor: isCorrect ? "#37c871" : isWrong ? "#ff7b7b" : undefined }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div style={{ height: 6 }} />
        </div>
      </div>
    </div>
  );
}
