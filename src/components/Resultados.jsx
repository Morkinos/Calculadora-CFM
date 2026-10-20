import { nombreDe } from "../lib/calculo.js";
import { IconoResultado } from "./Iconos.jsx";

const n0 = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 });
const n1 = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 1 });
const pct = (x) => `${n0.format(x * 100)}%`;

function Dato({ titulo, valor, unidad, destacado }) {
  return (
    <div className={destacado ? "dato dato-destacado" : "dato"}>
      <span className="dato-titulo">{titulo}</span>
      <span className="dato-valor">
        {valor} <small>{unidad}</small>
      </span>
    </div>
  );
}

export default function Resultados({ resultado, renovaciones, ruidoMaxDb, entradaAire = true }) {
  const hayLimiteRuido = Number.isFinite(ruidoMaxDb);

  if (!resultado) {
    return (
      <section className="tarjeta tarjeta-oscura vacio" aria-live="polite">
        <h2>Resultado</h2>
        <div className="vacio-contenido">
          <span className="vacio-icono">
            <IconoResultado />
          </span>
          <p className="vacio-titulo">Aquí verá el modelo recomendado</p>
          <p>Complete largo, ancho y altura del local. El resultado se calcula al instante, con la cantidad de ventiladores necesaria.</p>
          <ul className="vacio-lista">
            <li>Largo y ancho en metros</li>
            <li>Altura máxima (y mínima si el techo es inclinado)</li>
            <li>Tipo de local y nivel de calor</li>
          </ul>
        </div>
      </section>
    );
  }

  const { volumen, caudalRequerido, caudalRequeridoCfm, caudalRequeridoLps, opciones } = resultado;
  const [mejor, ...otras] = opciones;
  const hayFuncion = otras.some((o) => o.extraccion || o.inyeccion);

  return (
    <section className="tarjeta tarjeta-oscura" aria-live="polite">
      <h2>Resultado</h2>

      <div className="datos">
        <Dato titulo="Caudal requerido" valor={n0.format(caudalRequeridoCfm)} unidad="CFM" destacado />
        <Dato titulo="Equivalente" valor={n0.format(caudalRequerido)} unidad="m³/h" />
        <Dato titulo="Volumen del local" valor={n1.format(volumen)} unidad="m³" />
        <Dato titulo="Renovaciones" valor={n1.format(renovaciones)} unidad="por hora" />
      </div>
      <p className="equivalencia">También equivale a {n0.format(caudalRequeridoLps)} l/s.</p>

      {!mejor ? (
        <p className="aviso">
          Ningún modelo del catálogo cumple con los filtros seleccionados (voltaje, alcance
          {hayLimiteRuido ? ` o límite de ${n0.format(ruidoMaxDb)} dB` : " o ruido"}). Pruebe cambiando alguno de ellos.
        </p>
      ) : (
        <>
          <div className="recomendado">
            <span className="etiqueta">Más apto</span>
            <p className="modelo">
              {nombreDe(mejor)} <span className="x">× {mejor.unidades}</span>
            </p>
            {mejor.preferida && (
              <p className="detalle">★ Línea doméstica: es la preferida para este tipo de local por ser más fácil de instalar.</p>
            )}
            {mejor.enPareja && (
              <p className="detalle">
                ⇄ Pareja de axiales: {mejor.unidadesPorLado} {mejor.unidadesPorLado === 1 ? "inyector" : "inyectores"} +{" "}
                {mejor.unidadesPorLado} {mejor.unidadesPorLado === 1 ? "extractor" : "extractores"} ({mejor.unidades} unidades en total).
              </p>
            )}
            {mejor.axial && entradaAire && (
              <p className="detalle">→ Se instala como inyector: el aire caliente sale por la entrada de aire del local.</p>
            )}
            {mejor.extraccion && <p className="detalle">✓ Sirve para extracción de aire.</p>}
            {mejor.inyeccion && <p className="detalle">✓ Sirve para inyección de aire.</p>}
            <p className="detalle">
              {mejor.unidades === 1 ? "1 unidad" : `${mejor.unidades} unidades`} · {n0.format(mejor.caudalTotalCfm)} CFM efectivos
              {mejor.enPareja ? " por lado" : ""} (
              {n0.format(mejor.caudalTotal)} m³/h) · {n1.format(mejor.renovacionesReales)} renovaciones/h reales ·{" "}
              {n0.format(mejor.potenciaTotalW)} W en total · {mejor.voltaje} V
              {mejor.ruidoMax ? ` · hasta ${mejor.ruidoMax} dB` : ""}
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
                      <th>Caudal total (CFM)</th>
                      <th>Exceso</th>
                      <th>Potencia (W)</th>
                      <th>Voltaje</th>
                      {hayFuncion && <th>Función</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {otras.slice(0, 4).map((o) => (
                      <tr key={o.modelo}>
                        <td data-label="Modelo">
                          {nombreDe(o)}
                          {o.nota && <span title={o.nota}> ⚠</span>}
                        </td>
                        <td data-label="Cant.">
                          {o.unidades}
                          {o.enPareja ? ` (${o.unidadesPorLado}+${o.unidadesPorLado})` : ""}
                        </td>
                        <td data-label="Caudal total">{n0.format(o.caudalTotalCfm)}</td>
                        <td data-label="Exceso">{pct(o.exceso)}</td>
                        <td data-label="Potencia">{n0.format(o.potenciaTotalW)}</td>
                        <td data-label="Voltaje">{o.voltaje} V</td>
                        {hayFuncion && (
                          <td data-label="Función">
                            {[o.extraccion && "Extrae", o.inyeccion && "Inyecta"].filter(Boolean).join(" / ") || "—"}
                          </td>
                        )}
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
