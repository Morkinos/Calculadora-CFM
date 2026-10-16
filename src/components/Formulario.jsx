function Campo({ id, etiqueta, ayuda, children }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      {children}
      {ayuda && <small>{ayuda}</small>}
    </div>
  );
}

export default function Formulario({ form, setForm, locales, nivelesRuido, renovaciones, onLimpiar }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const num = (k) => ({
    type: "text",
    inputMode: "decimal",
    value: form[k],
    onChange: set(k),
    placeholder: "0",
    autoComplete: "off",
  });

  return (
    <section className="tarjeta" aria-labelledby="t-datos">
      <h2 id="t-datos">Datos del local</h2>

      <div className="fila3">
        <Campo id="largo" etiqueta="Largo (m)">
          <input id="largo" {...num("largo")} />
        </Campo>
        <Campo id="ancho" etiqueta="Ancho (m)">
          <input id="ancho" {...num("ancho")} />
        </Campo>
        <Campo id="alto" etiqueta="Alto (m)">
          <input id="alto" {...num("alto")} />
        </Campo>
      </div>

      <Campo id="local" etiqueta="Tipo de local" ayuda={`Renovaciones de aire usadas: ${Number.isFinite(renovaciones) ? renovaciones : "—"} por hora`}>
        <select id="local" value={form.local} onChange={set("local")}>
          {locales.map((l) => (
            <option key={l.nombre} value={l.nombre}>
              {l.nombre} ({l.renovaciones} ren/h)
            </option>
          ))}
        </select>
      </Campo>

      <Campo id="manual" etiqueta="Renovaciones por hora manual (opcional)" ayuda="Si lo llena, se usa este valor en lugar del tipo de local.">
        <input id="manual" {...num("renovacionesManual")} placeholder="Ej. 12" />
      </Campo>

      <Campo
        id="funcion"
        etiqueta="Función del ventilador"
        ayuda="Extracción: solo modelos que sirven para extraer y expulsar aire del local."
      >
        <select id="funcion" value={form.funcion} onChange={set("funcion")}>
          <option value="cualquiera">Cualquiera</option>
          <option value="extraccion">Extracción / expulsión de aire</option>
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

      {form.ruido === "personalizado" && (
        <Campo id="ruidoPersonalizado" etiqueta="Ruido máximo permitido (dB)">
          <input id="ruidoPersonalizado" {...num("ruidoPersonalizado")} placeholder="Ej. 65" />
        </Campo>
      )}

      <div className="fila2">
        <Campo id="voltaje" etiqueta="Voltaje disponible">
          <select id="voltaje" value={form.voltaje} onChange={set("voltaje")}>
            <option>Cualquiera</option>
            <option>110V</option>
            <option>220V</option>
          </select>
        </Campo>
        <Campo id="eficiencia" etiqueta={`Factor de eficiencia: ${form.eficiencia}%`} ayuda="Caudal real = caudal de catálogo × factor. Use 100% para el caudal tal cual.">
          <input
            id="eficiencia"
            type="range"
            min="50"
            max="100"
            step="5"
            value={form.eficiencia}
            onChange={(e) => setForm((f) => ({ ...f, eficiencia: Number(e.target.value) }))}
          />
        </Campo>
      </div>

      <button type="button" className="secundario" onClick={onLimpiar}>
        Limpiar
      </button>
    </section>
  );
}
