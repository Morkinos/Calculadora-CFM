import { useRef, useState } from "react";
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

// Barra comparativa: caudal requerido vs. caudal que brinda el ventilador.
function Comparativa({ requeridoCfm, brindadoCfm, catalogoCfm, porLado, resultado }) {
  const tope = Math.max(requeridoCfm, brindadoCfm, catalogoCfm);
  const ancho = (v) => `${Math.max(2, (v / tope) * 100)}%`;
  const { caudalRenovaciones, caudalPersonas } = resultado;
  const cubre = brindadoCfm >= requeridoCfm;
  return (
    <div className="comparativa" role="group" aria-label="Caudal requerido y caudal brindado">
      <h4>Caudal requerido vs. brindado{porLado ? " (por lado)" : ""}</h4>
      <div className="barra-fila">
        <span className="barra-nombre">Requerido</span>
        <span className="barra-pista">
          <span className="barra barra-requerido" style={{ width: ancho(requeridoCfm) }} />
        </span>
        <strong>{n0.format(requeridoCfm)} CFM</strong>
      </div>
      <div className="barra-fila">
        <span className="barra-nombre">Brindado</span>
        <span className="barra-pista">
          <span className="barra barra-brindado" style={{ width: ancho(brindadoCfm) }} />
        </span>
        <strong>{n0.format(brindadoCfm)} CFM</strong>
      </div>
      <p className="comparativa-nota">
        {cubre ? "✓ Cubre" : "⚠ No cubre"} el caudal requerido: brinda {pct(brindadoCfm / requeridoCfm)} de lo requerido, al 80% de rendimiento real.
        En catálogo (100%) las unidades suman {n0.format(catalogoCfm)} CFM.
        {caudalPersonas > 0 &&
          ` El requerido incluye ${n0.format(caudalRenovaciones * 0.5886)} CFM por renovaciones + ${n0.format(caudalPersonas * 0.5886)} CFM por personas.`}
      </p>
    </div>
  );
}

export default function Resultados({ resultado, renovaciones, ruidoMaxDb, funcion = "cualquiera", entradaAire = true }) {
  const [eleccion, setEleccion] = useState(null);
  const principalRef = useRef(null);

  // Al elegir una fila, el modelo pasa a ser el resultado principal y se lleva la vista hasta él si quedó fuera de pantalla.
  const elegir = (modelo) => {
    setEleccion(modelo);
    requestAnimationFrame(() => principalRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };
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
            <li>Tipo de local, nivel de calor y contaminantes</li>
          </ul>
        </div>
      </section>
    );
  }

  const { volumen, caudalRequerido, caudalRequeridoCfm, caudalRequeridoLps, opciones } = resultado;
  const recomendado = opciones[0];
  // El usuario puede elegir cualquier modelo de la lista como resultado principal.
  const mejor = opciones.find((o) => o.modelo === eleccion) ?? recomendado;
  const esRecomendado = mejor === recomendado;
  const otras = opciones.filter((o) => o !== mejor).slice(0, 6);
  const hayFuncion = opciones.some((o) => o.extraccion || o.inyeccion);

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
          Ningún modelo del catálogo cumple con los filtros seleccionados (línea, voltaje, alcance
          {hayLimiteRuido ? ` o límite de ${n0.format(ruidoMaxDb)} dB` : " o ruido"}). Pruebe cambiando alguno de ellos.
        </p>
      ) : (
        <>
          <div className="recomendado" ref={principalRef}>
            <span className="etiqueta">{esRecomendado ? "Más apto" : "Seleccionado por usted"}</span>
            <p className="modelo">
              {nombreDe(mejor)} <span className="x">× {mejor.unidades}</span>
            </p>
            {!esRecomendado && (
              <button type="button" className="enlace-boton" onClick={() => setEleccion(null)}>
                ← Volver a la recomendada ({nombreDe(recomendado)} × {recomendado.unidades})
              </button>
            )}
            {mejor.preferida && (
              <p className="detalle">★ Línea doméstica: es la preferida para este tipo de local por ser más fácil de instalar.</p>
            )}
            {funcion === "ambas" && (
              <p className="detalle">
                ⇄ Inyección + extracción: {mejor.unidadesPorLado} {mejor.unidadesPorLado === 1 ? "inyector" : "inyectores"} +{" "}
                {mejor.unidadesPorLado} {mejor.unidadesPorLado === 1 ? "extractor" : "extractores"} ({mejor.unidades} unidades en total).
              </p>
            )}
            {funcion !== "ambas" && mejor.enPareja && (
              <p className="detalle">
                ⇄ Pareja de axiales: {mejor.unidadesPorLado} {mejor.unidadesPorLado === 1 ? "inyector" : "inyectores"} +{" "}
                {mejor.unidadesPorLado} {mejor.unidadesPorLado === 1 ? "extractor" : "extractores"} ({mejor.unidades} unidades en total).
              </p>
            )}
            {mejor.axial && entradaAire && funcion !== "ambas" && (
              <p className="detalle">→ Se instala como inyector: el aire caliente sale por la entrada de aire del local.</p>
            )}
            {mejor.extraccion && !mejor.inyeccion && <p className="detalle">✓ Sirve para extracción de aire.</p>}
            {mejor.extraccion && mejor.inyeccion && <p className="detalle">✓ Sirve para extracción e inyección de aire.</p>}
            {mejor.inyeccion && !mejor.extraccion && <p className="detalle">✓ Sirve para inyección de aire.</p>}

            <Comparativa
              requeridoCfm={caudalRequeridoCfm}
              brindadoCfm={mejor.caudalTotalCfm}
              catalogoCfm={mejor.caudalCatalogoCfm}
              porLado={mejor.enPareja}
              resultado={resultado}
            />

            <p className="detalle">
              {mejor.unidades === 1 ? "1 unidad" : `${mejor.unidades} unidades`} · {n1.format(mejor.renovacionesReales)} renovaciones/h
              reales · {n0.format(mejor.potenciaTotalW)} W en total · {mejor.voltaje} V
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
              <h3>Otras opciones · toque una fila para verla como resultado principal</h3>
              <div className="tabla-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Modelo</th>
                      <th>Cant.</th>
                      <th>Brindado (CFM)</th>
                      <th>Exceso</th>
                      <th>Potencia (W)</th>
                      <th>Voltaje</th>
                      {hayFuncion && <th>Función</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {otras.map((o) => (
                      <tr
                        key={o.modelo}
                        className="fila-elegible"
                        tabIndex={0}
                        role="button"
                        aria-label={`Ver ${nombreDe(o)} como resultado principal`}
                        onClick={() => elegir(o.modelo)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            elegir(o.modelo);
                          }
                        }}
                      >
                        <td data-label="Modelo">
                          {nombreDe(o)}
                          {o === recomendado && <span className="mini-etiqueta">Más apto</span>}
                          {o.nota && <span title={o.nota}> ⚠</span>}
                        </td>
                        <td data-label="Cant.">
                          {o.unidades}
                          {o.enPareja ? ` (${o.unidadesPorLado}+${o.unidadesPorLado})` : ""}
                        </td>
                        <td data-label="Brindado">{n0.format(o.caudalTotalCfm)}</td>
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
