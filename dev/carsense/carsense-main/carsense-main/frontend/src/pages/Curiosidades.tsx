// src/pages/Curiosidades.tsx
type Fact = { titulo: string; detalle: string; fuente?: string };

const FACTS_MX: Fact[] = [
  {
    titulo: "El cinturón salva vidas",
    detalle:
      "Usar el cinturón reduce de forma importante el riesgo de muerte y lesiones graves en choques. En México es obligatorio en todos los asientos en la mayoría de estados.",
    fuente: "OMS y NHTSA (estadísticas de seguridad vial)",
  },
  {
    titulo: "Presión correcta = frenado más corto",
    detalle:
      "Llantas bien infladas mejoran el agarre y reducen distancia de frenado. Revisa la presión en frío al menos cada 2 semanas y antes de viajes largos.",
    fuente: "Fabricantes de neumáticos / manual del vehículo",
  },
  {
    titulo: "Aceite: no sólo kilómetros, también tiempo",
    detalle:
      "Aunque manejes poco, el aceite se degrada con los meses por humedad/oxidación. Muchas marcas recomiendan cambiarlo cada 6 a 12 meses, aun con poco kilometraje.",
    fuente: "Manual de servicio del fabricante",
  },
  {
    titulo: "ABS no acorta siempre la frenada, pero mantiene control",
    detalle:
      "El ABS evita que las ruedas se bloqueen y te ayuda a girar durante una frenada de emergencia. En superficies sueltas puede no reducir distancia, pero sí mejora el control.",
    fuente: "Manuales de sistemas ABS / pruebas de seguridad",
  },
  {
    titulo: "Niños: silla correcta, instalación correcta",
    detalle:
      "La silla infantil adecuada a talla y peso, bien instalada (ISOFIX o cinturón), reduce drásticamente lesiones en menores. Evita colocarla en asiento delantero con bolsa de aire activa.",
    fuente: "Normas de retención infantil / OMS",
  },
  {
    titulo: "Luces altas no siempre ayudan",
    detalle:
      "Usar altas en ciudad o con tráfico puede deslumbrar y aumentar riesgo. En lluvia o niebla, usa bajas y, si aplica, nieblas; las altas rebotan en gotas y reducen visibilidad.",
    fuente: "Reglamentos de tránsito y guías de conducción",
  },
  {
    titulo: "Mantenimiento preventivo = ahorro real",
    detalle:
      "Cambiar filtros, bujías y fluidos a tiempo evita fallas costosas y mejora consumo. Programa recordatorios por kilometraje y por fecha.",
    fuente: "Buenas prácticas de mantenimiento automotriz",
  },
];

export default function Curiosidades() {
  return (
    <div className="container" style={{ display: "grid", gap: 18, paddingTop: 18 }}>
      {/* Encabezado */}
      <div className="panel curios-header">
        <h1 style={{ margin: 0 }}>Curiosidades y tips de conducción</h1>
        <p className="muted" style={{ marginTop: 6, maxWidth: 900 }}>
          Consejos prácticos y datos útiles para conducir más seguro y cuidar tu coche.
        </p>
      </div>

      {/* Grid responsivo de tarjetas */}
      <div className="curios-grid">
        {FACTS_MX.map((f, i) => (
          <article key={i} className="panel curios-card">
            <h3 style={{ marginTop: 0, marginBottom: 6, lineHeight: 1.25 }}>{f.titulo}</h3>
            <p className="muted" style={{ margin: 0, lineHeight: 1.5, wordWrap: "break-word" }}>
              {f.detalle}
            </p>
            {f.fuente && (
              <p
                className="muted"
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  opacity: 0.8,
                }}
              >
                <span className="badge" style={{ marginRight: 8 }}>Fuente</span>
                {f.fuente}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
