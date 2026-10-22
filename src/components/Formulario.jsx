import { aNumero } from "../lib/calculo.js";

// Nivel de calor: Bajo = mínimo del rango de renovaciones, Medio = media, Alto = máximo.
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

export default function Formulario({ form, setForm, locales, nivelesRuido, contaminantes, factorContaminante, renovaciones, onLimpiar }) {
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

  return (
    <section className="tarjeta" aria-labelledby="t-datos">
      <h2 id="t-datos">Datos del local</h2>

      <div className="campo">
        <span className="etiqueta-campo" id="t-linea">
          Línea de ventiladores
        </span>
        <div className="segmentado" role="group" aria-labelledby="t-linea">
          {LINEAS.map(([id, texto]) => (
            <button
              type="button"
              key={id}
              aria-pressed={form.linea === id}
              className={form.linea === id ? "activo" : ""}
              onClick={() => setForm((f) => ({ ...f, linea: id }))}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>

      <div className="fila3">
        <Campo id="largo" etiqueta="Largo (m)">
          <input id="largo" {...num("largo")} />
        </Campo>
        <Campo id="ancho" etiqueta="Ancho (m)">
          <input id="ancho" {...num("ancho")} />
        </Campo>
        <Campo id="alto" etiqueta="Altura máx. (m)">
          <input id="alto" {...num("alto")} />
        </Campo>
      </div>

      {invalidos.length > 0 && (
        <p className="error" role="alert">
          <span aria-hidden="true">⚠</span> Escriba un número mayor que 0 en {invalidos.map((k) => ({ largo: "largo", ancho: "ancho", alto: "altura" })[k]).join(", ")} (ej. 4,5).
        </p>
      )}

      <Campo
        id="altoMin"
        etiqueta="Altura mínima (m) (opcional)"
        ayuda="Si el techo es inclinado, el volumen usa el promedio de la altura máxima y la mínima."
      >
        <input id="altoMin" {...num("altoMin")} placeholder="Ej. 3" />
      </Campo>

      <Campo
        id="local"
        etiqueta="Tipo de local"
        ayuda={
          local
            ? `${local.nivel}: ${local.min}–${local.max} renovaciones por hora (aprox.)`
            : "Seleccione el tipo de local"
        }
      >
        <select id="local" value={form.local} onChange={set("local")}>
          {locales.map((l) => (
            <option key={l.nombre} value={l.nombre}>
              {l.nombre} ({l.min}–{l.max} ren/h)
            </option>
          ))}
        </select>
      </Campo>

      <div className="campo">
        <span className="etiqueta-campo" id="t-calor">
          Nivel de calor
        </span>
        <div className="segmentado" role="group" aria-labelledby="t-calor">
          {NIVELES_CALOR.map(([id, texto]) => (
            <button
              type="button"
              key={id}
              aria-pressed={form.calor === id}
              className={form.calor === id ? "activo" : ""}
              disabled={usaManual}
              onClick={() => setForm((f) => ({ ...f, calor: id }))}
            >
              {texto}
            </button>
          ))}
        </div>
        <small>
          Más calor = más renovaciones por hora dentro del rango del local, para refrescar más con las mismas medidas.
          Renovaciones usadas: <strong>{Number.isFinite(renovaciones) ? fmt(Math.round(renovaciones * 10) / 10) : "—"}</strong> por hora
          {usaManual ? " (valor manual)" : ""}{factorContaminante > 1 ? ` · incluye ×${fmt(factorContaminante)} por contaminantes` : ""}
        </small>
      </div>

      <Campo id="manual" etiqueta="Renovaciones por hora manual (opcional)" ayuda="Si lo llena, se usa este valor en lugar del tipo de local.">
        <input id="manual" {...num("renovacionesManual")} placeholder="Ej. 12" />
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

      <div className="campo">
        <span className="etiqueta-campo" id="t-funcion">
          Alcance requerido
        </span>
        <div className="segmentado segmentado-4" role="group" aria-labelledby="t-funcion">
          {ALCANCES.map(([id, texto]) => (
            <button
              type="button"
              key={id}
              aria-pressed={form.funcion === id}
              className={form.funcion === id ? "activo" : ""}
              onClick={() => setForm((f) => ({ ...f, funcion: id }))}
            >
              {texto}
            </button>
          ))}
        </div>
        <small>
          {form.funcion === "ambas"
            ? "Ambas: se recomienda una pareja (un inyector + un extractor) con modelos que pueden hacer las dos funciones."
            : "Extracción o inyección: solo modelos marcados para esa función en el catálogo."}
        </small>
      </div>

      <Campo
        id="contaminante"
        etiqueta="¿Hay contaminantes en el local?"
        ayuda={
          factorContaminante > 1
            ? `Se multiplican las renovaciones por hora ×${fmt(factorContaminante)} (criterio estimado).`
            : "Humo, vapores, polvo, gases o químicos requieren más renovaciones de aire."
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
        id="ruido"
        etiqueta="¿Hay personas en el local?"
        ayuda="Define el límite de ruido por unidad, según el ruido máximo del catálogo (a velocidad máxima)."
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
          etiqueta="Cantidad de personas (aprox.)"
          ayuda="Las personas consumen aire y lo contaminan: se suma el aire de ventilación por persona (referencia ASHRAE 62.1) al de las renovaciones."
        >
          <input id="personas" {...num("personas")} placeholder="Ej. 20" />
        </Campo>
      )}

      {form.ruido === "personalizado" && (
        <Campo id="ruidoPersonalizado" etiqueta="Ruido máximo permitido (dB)">
          <input id="ruidoPersonalizado" {...num("ruidoPersonalizado")} placeholder="Ej. 65" />
        </Campo>
      )}

      <div className="fila2">
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
      </div>

      <button type="button" className="secundario" onClick={onLimpiar}>
        Limpiar
      </button>
    </section>
  );
}
