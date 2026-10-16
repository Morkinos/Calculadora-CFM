import { nombreDe } from "../lib/calculo.js";

const n0 = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 });
const n1 = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 1 });
const pct = (x) => `${n0.format(x * 100)}%`;

function Dato({ titulo, valor, unidad }) {
  return (
    <div className="dato">
      <span className="dato-titulo">{titulo}</span>
      <span className="dato-valor">
        {valor} <small>{unidad}</small>
      </span>
    </div>
  );
}

export default function Resultados({ resultado, renovaciones, ruidoMaxDb }) {
  const hayLimiteRuido = Number.isFinite(ruidoMaxDb);
  if (!resultado) {
    return (
      <section className="tarjeta vacio" aria-live="polite">
        <h2>Resultado</h2>
        <p>Complete largo, ancho y alto del local para ver el modelo recomendado.</p>
      </section>
    );
  }

  const { volumen, caudalRequerido, caudalRequeridoCfm, opciones } = resultado;
  const [mejor, ...otras] = opciones;

  return (
    <section className="tarjeta" aria-live="polite">
      <h2>Resultado</h2>

      <div className="datos">
        <Dato titulo="Volumen del local" valor={n1.format(volumen)} unidad="m³" />
        <Dato titulo="Renovaciones" valor={n1.format(renovaciones)} unidad="por hora" />
        <Dato titulo="Caudal requerido" valor={n0.format(caudalRequerido)} unidad="m³/h" />
        <Dato titulo="Equivalente" valor={n0.format(caudalRequeridoCfm)} unidad="CFM" />
      </div>

      {!mejor ? (
        <p className="aviso">
          Ningún modelo del catálogo cumple con el voltaje{hayLimiteRuido ? ` y el límite de ${n0.format(ruidoMaxDb)} dB` : ""}{" "}
          seleccionados. Pruebe con otro voltaje{hayLimiteRuido ? " o un nivel de ruido más alto" : ""}.
        </p>
      ) : (
        <>
          <div className="recomendado">
            <span className="etiqueta">Más apto</span>
            <p className="modelo">
              {nombreDe(mejor)} <span className="x">× {mejor.unidades}</span>
            </p>
            {mejor.extraccion && <p className="detalle">✓ Sirve para extracción y expulsión de aire.</p>}
            <p className="detalle">
              {mejor.unidades === 1 ? "1 unidad" : `${mejor.unidades} unidades`} · {n0.format(mejor.caudalTotal)} m³/h efectivos ·{" "}
              {n1.format(mejor.renovacionesReales)} renovaciones/h reales · {n0.format(mejor.potenciaTotalW)} W en total ·{" "}
              {mejor.voltaje} V{mejor.ruidoMax ? ` · hasta ${mejor.ruidoMax} dB` : ""}
            </p>
            {mejor.nota && <p className="nota">⚠ {mejor.nota}</p>}
            {hayLimiteRuido && (
              <p className="detalle">
                Solo se consideran modelos de hasta {n0.format(ruidoMaxDb)} dB por unidad. Con varias unidades funcionando a la vez, el
                ruido total en el local es mayor.
              </p>
            )}
          </div>

          {otras.length > 0 && (
            <>
              <h3>Otras opciones</h3>
              <div className="tabla-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Modelo</th>
                      <th>Cant.</th>
                      <th>Caudal total (m³/h)</th>
                      <th>Exceso</th>
                      <th>Potencia (W)</th>
                      <th>Voltaje</th>
                      <th>Extrae aire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otras.slice(0, 4).map((o) => (
                      <tr key={o.modelo}>
                        <td data-label="Modelo">
                          {nombreDe(o)}
                          {o.nota && <span title={o.nota}> ⚠</span>}
                        </td>
                        <td data-label="Cant.">{o.unidades}</td>
                        <td data-label="Caudal total">{n0.format(o.caudalTotal)}</td>
                        <td data-label="Exceso">{pct(o.exceso)}</td>
                        <td data-label="Potencia">{n0.format(o.potenciaTotalW)}</td>
                        <td data-label="Voltaje">{o.voltaje} V</td>
                        <td data-label="Extrae aire">{o.extraccion ? "Sí" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
