import { aNumero } from "../lib/calculo.js";

// Calor de la zona: Bajo = mínimo del rango de renovaciones, Medio = media, Alto = máximo.
// Pensado para las zonas del país: las más calientes necesitan más renovaciones de aire.
const NIVELES_CALOR = [
  ["bajo", "Bajo"],
  ["medio", "Medio"],
  ["alto", "Alto"],
];

const ALCANCES = [
  ["cualquiera", "Cualquiera"],
  ["extraccion", "Extracción"],
  ["inyeccion", "Inyección"],
  ["ambas", "Ambas"],
];

const LINEAS = [
  ["industrial", "Industrial"],
  ["domestica", "Doméstica"],
  ["todas", "Todas"],
];

function Campo({ id, etiqueta, ayuda, children }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      {children}
      {ayuda && <small>{ayuda}</small>}
    </div>
  );
}

const fmt = (n) => String(n).replace(".", ",");

export default function Formulario({ form, setForm, locales, nivelesRuido, escalaRuido, contaminantes, factorContaminante, renovaciones, onLimpiar }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const num = (k) => ({
    type: "text",
    inputMode: "decimal",
    value: form[k],
    onChange: set(k),
    placeholder: "0",
    autoComplete: "off",
    "aria-invalid": invalido(k) || undefined,
  });
  // Validación: texto escrito que no es un número mayor que 0.
  const invalido = (k) => form[k].trim() !== "" && !(aNumero(form[k]) > 0);
  const invalidos = ["largo", "ancho", "alto"].filter(invalido);
  const local = locales.find((l) => l.nombre === form.local);
  const usaManual = form.renovacionesManual.trim() !== "";

  // Ajustes avanzados que no están en su valor por defecto (para avisar que hay filtros activos aunque el bloque esté cerrado).
  const avanzadosActivos = [
    form.linea !== "todas",
    form.altoMin.trim() !== "",
    usaManual,
    form.funcion !== "cualquiera",
    form.voltaje !== "Cualquiera",
    form.cobertura !== 100,
  ].filter(Boolean).length;

  const botones = (opciones, clave, extra = {}) =>
    opciones.map(([id, texto]) => (
      <button
        type="button"
        key={id}
        aria-pressed={form[clave] === id}
        className={form[clave] === id ? "activo" : ""}
        onClick={() => setForm((f) => ({ ...f, [clave]: id }))}
        {...extra}
      >
        {texto}
      </button>
    ));

  return (
    <section className="tarjeta" aria-labelledby="t-datos">
      <div className="tarjeta-cabecera">
        <h2 id="t-datos">Datos del local</h2>
        <button type="button" className="secundario boton-limpiar" onClick={onLimpiar}>
          Limpiar
        </button>
      </div>

      {/* ── Datos principales: 1 columna en celular, 2 en tableta, 3 en computadora ── */}
      <div className="form-grid">
      <div className="fila3">
        <Campo id="largo" etiqueta="Largo (m)">
          <input id="largo" {...num("largo")} />
        </Campo>
        <Campo id="ancho" etiqueta="Ancho (m)">
          <input id="ancho" {...num("ancho")} />
        </Campo>
        <Campo id="alto" etiqueta="Altura (m)">
          <input id="alto" {...num("alto")} />
        </Campo>
      </div>

      {invalidos.length > 0 && (
        <p className="error ancho-completo" role="alert">
          <span aria-hidden="true">⚠</span> Escriba un número mayor que 0 en {invalidos.map((k) => ({ largo: "largo", ancho: "ancho", alto: "altura" })[k]).join(", ")} (ej. 4,5).
        </p>
      )}

      <Campo
        id="local"
        etiqueta="Tipo de local"
        ayuda={
          local
            ? `${local.nivel}: ${local.min}–${local.max} renovaciones por hora (aprox.)`
            : "Seleccione el tipo de local"
        }
      >
        <select
          id="local"
          value={form.local}
          onChange={(e) => {
            // Al cambiar el tipo de local, la pregunta de personas toma el valor típico de ese local (se puede cambiar después).
            const elegido = locales.find((l) => l.nombre === e.target.value);
            setForm((f) => ({ ...f, local: e.target.value, ruido: elegido?.personas ?? f.ruido }));
          }}
        >
          {locales.map((l) => (
            <option key={l.nombre} value={l.nombre}>
              {l.nombre} ({l.min}–{l.max} ren/h)
            </option>
          ))}
        </select>
      </Campo>

      <div className="campo">
        <span className="etiqueta-campo" id="t-calor">
          Calor de la zona
        </span>
        <div className="segmentado" role="group" aria-labelledby="t-calor">
          {botones(NIVELES_CALOR, "calor", { disabled: usaManual })}
        </div>
        <small>
          Zonas más calientes necesitan más renovaciones dentro del rango del local. Bajo: zonas altas y frescas · Medio: Valle Central ·
          Alto: costas y bajuras. Renovaciones usadas: <strong>{Number.isFinite(renovaciones) ? fmt(Math.round(renovaciones * 10) / 10) : "—"}</strong> por hora
          {usaManual ? " (valor manual)" : ""}{factorContaminante > 1 ? ` · incluye ×${fmt(factorContaminante)} por contaminantes` : ""}
        </small>
      </div>

      <Campo
        id="contaminante"
        etiqueta="¿Hay contaminantes en el local?"
        ayuda={
          factorContaminante > 1
            ? `Se multiplican las renovaciones por hora ×${fmt(factorContaminante)} (criterio estimado).`
            : "Úselo cuando el tipo de local no lo refleja, por ejemplo una bodega de químicos: humo, vapores, polvo o gases requieren más renovaciones."
        }
      >
        <select id="contaminante" value={form.contaminante} onChange={set("contaminante")}>
          {contaminantes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.etiqueta}
            </option>
          ))}
        </select>
      </Campo>

      <Campo
        id="entradaAire"
        etiqueta="¿El local tiene entrada de aire?"
        ayuda="Con entrada de aire (aberturas), el aire caliente sale por ellas y basta un inyector. Sin entrada, los axiales se instalan en pareja: uno inyecta y otro extrae."
      >
        <select id="entradaAire" value={form.entradaAire} onChange={set("entradaAire")}>
          <option value="si">Sí, tiene entrada de aire</option>
          <option value="no">No, es un espacio cerrado</option>
        </select>
      </Campo>

      <div className="celda">
      <Campo
        id="ruido"
        etiqueta="¿Hay personas en el local?"
        ayuda="Se llena según el tipo de local; cámbielo si no aplica. Con personas se limita el ruido por unidad (escala de VEGGA, 1 a 15)."
      >
        <select id="ruido" value={form.ruido} onChange={set("ruido")}>
          {nivelesRuido.map((r) => (
            <option key={r.id} value={r.id}>
              {r.etiqueta}
            </option>
          ))}
        </select>
      </Campo>

      {form.ruido !== "libre" && (
        <Campo
          id="personas"
          etiqueta="Cantidad de personas (aprox., opcional)"
          ayuda="Se suma el aire de ventilación por persona (referencia ASHRAE 62.1) al de las renovaciones."
        >
          <input id="personas" {...num("personas")} placeholder="Ej. 20" />
        </Campo>
      )}

      {form.ruido === "personalizado" && (
        <Campo id="ruidoPersonalizado" etiqueta="Nivel de ruido máximo permitido">
          <select id="ruidoPersonalizado" value={form.ruidoPersonalizado} onChange={set("ruidoPersonalizado")}>
            <option value="">Sin límite</option>
            {escalaRuido.map((e) => (
              <option key={e.nivel} value={e.nivel}>
                {e.nivel} · {e.nombre} ({e.db})
              </option>
            ))}
          </select>
        </Campo>
      )}

      </div>
      </div>

      {/* ── Ajustes avanzados (plegados) ── */}
      <details className="escala avanzado">
        <summary>
          Ajustes avanzados{avanzadosActivos > 0 ? ` · ${avanzadosActivos} ${avanzadosActivos === 1 ? "cambiado" : "cambiados"}` : ""}
        </summary>
        <div className="avanzado-contenido form-grid">
          <div className="campo">
            <span className="etiqueta-campo" id="t-linea">
              Línea de ventiladores
            </span>
            <div className="segmentado" role="group" aria-labelledby="t-linea">
              {botones(LINEAS, "linea")}
            </div>
          </div>

          <Campo
            id="altoMin"
            etiqueta="Altura mínima (m) (opcional)"
            ayuda="Si el techo es inclinado, ponga aquí la altura más baja y arriba la más alta: el volumen usa el promedio."
          >
            <input id="altoMin" {...num("altoMin")} placeholder="Ej. 3" />
          </Campo>

          <Campo id="manual" etiqueta="Renovaciones por hora manual (opcional)" ayuda="Si lo llena, se usa este valor en lugar del tipo de local y el calor de la zona.">
            <input id="manual" {...num("renovacionesManual")} placeholder="Ej. 12" />
          </Campo>

          <div className="campo">
            <span className="etiqueta-campo" id="t-funcion">
              Alcance requerido
            </span>
            <div className="segmentado segmentado-4" role="group" aria-labelledby="t-funcion">
              {botones(ALCANCES, "funcion")}
            </div>
            <small>
              {form.funcion === "ambas"
                ? "Ambas: se recomienda una pareja (un inyector + un extractor) con modelos que pueden hacer las dos funciones."
                : "Extracción o inyección: solo modelos marcados para esa función en el catálogo."}
            </small>
          </div>

            <Campo id="voltaje" etiqueta="Conexión eléctrica">
              <select id="voltaje" value={form.voltaje} onChange={set("voltaje")}>
                <option value="Cualquiera">Cualquiera</option>
                <option value="120V">120 V (110/120)</option>
                <option value="220V">220 V</option>
              </select>
            </Campo>
            <Campo
              id="cobertura"
              etiqueta={`Caudal a cubrir: ${form.cobertura}%`}
              ayuda="100% = el caudal requerido calculado (ya considera un rendimiento real del 80% del ventilador). Súbalo si necesita un poco más de aire."
            >
              <input
                id="cobertura"
                type="range"
                min="65"
                max="125"
                step="5"
                value={form.cobertura}
                onChange={(e) => setForm((f) => ({ ...f, cobertura: Number(e.target.value) }))}
              />
            </Campo>

          <details className="escala ancho-completo">
            <summary>Ver escala de ruido (1 a 15)</summary>
            <ol>
              {escalaRuido.map((e) => (
                <li key={e.nivel}>
                  <strong>{e.nivel} · {e.nombre}</strong> <span>{e.db}</span>
                  <small>{e.ejemplo}</small>
                </li>
              ))}
            </ol>
          </details>
        </div>
      </details>
    </section>
  );
}
