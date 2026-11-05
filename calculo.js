// Lógica de cálculo (sin React, para poder probarla aparte).

export const CFM_POR_M3H = 0.5886; // 1 m³/h = 0.5886 CFM
export const LPS_POR_M3H = 1 / 3.6; // 1 m³/h = 0.2778 l/s

// Rendimiento real supuesto de un ventilador respecto a su caudal de catálogo (instalación, rejillas, etc.).
export const RENDIMIENTO_VENTILADOR = 0.8;

// Si el tipo de local prefiere una línea (ej. doméstica, más fácil de instalar), sus modelos van primero
// siempre que no necesiten más de este número de unidades; si necesitan más, gana el criterio normal.
export const MAX_UNIDADES_PREFERIDA = 6;

// Tolerancia de exceso: si la opción con menos unidades da más de este exceso de aire, se busca una más ajustada.
export const TOLERANCIA_EXCESO = 0.3;
// La opción más ajustada puede usar como máximo esta cantidad de unidades más, contadas por lado (las parejas van de 2 en 2).
export const MAX_UNIDADES_EXTRA = 1;
// ...y consumir como máximo este porcentaje más de vatios que la opción con menos unidades.
export const MAX_AUMENTO_POTENCIA = 0.5;

/** Nivel de ruido (1–15) equivalente a un valor en dB: cada nivel agrupa 5 dB (nivel 1 = hasta 35 dB; 15 = más de 100). */
export const nivelDeDb = (db) => Math.min(15, Math.max(1, Math.ceil((db - 30) / 5)));

/**
 * Nivel de ruido percibido (1–15) de un modelo. Se usa `nivelRuido` (escala de VEGGA, editable en
 * ventiladores.json); si no existe, se convierte el ruido máximo del catálogo. Sin ningún dato → null.
 */
export const nivelRuidoDe = (f) => f.nivelRuido ?? (f.ruidoMax != null ? nivelDeDb(f.ruidoMax) : null);

/** Nombre que se muestra al usuario: solo el modelo (ej. "50T-W", "AIP-600"). */
export const nombreDe = (f) => f.nombreMostrado ?? f.modelo;

/** Voltaje nominal para filtrar: 110 V y 120 V se consideran la misma conexión (120 V). */
export const voltajeNominal = (f) => (f.voltaje === 110 ? 120 : f.voltaje);

/** Caudal de catálogo en m³/h. La fuente es el CFM de la ficha (o m³/min si no hubiera CFM). */
export const caudalCatalogoM3h = (f) => (f.cfm > 0 ? f.cfm / CFM_POR_M3H : (f.caudalM3min ?? 0) * 60);

/**
 * Renovaciones por hora de un tipo de local según el nivel de calor.
 * nivel: "bajo" (mínimo del rango) | "medio" (media) | "alto" (máximo del rango).
 * También acepta "min" | "media" | "max". La media es `media` si el local la define
 * (ej. almacén = 7 según DIN 1946) o el promedio del rango.
 */
export function renovacionesDe(local, nivel = "medio") {
  if (nivel === "bajo" || nivel === "min") return local.min;
  if (nivel === "alto" || nivel === "max") return local.max;
  return local.media ?? (local.min + local.max) / 2;
}

/**
 * @param {object} entrada
 *   largo, ancho, alto (m) · alto = altura máxima
 *   altoMin (opcional, m): si se indica, el volumen usa el promedio de ambas alturas (techo inclinado)
 *   renovaciones (por hora) · voltaje ("Cualquiera" | "120V" | "220V")
 *   linea (por defecto "industrial"): "industrial" | "domestica" | "todas"
 *   eficiencia (por defecto 0.8): caudal real de cada unidad = caudal de catálogo × eficiencia
 *   margen (por defecto 1): "caudal a cubrir"; se dimensiona para caudal requerido × margen (1.25 = 25 % más de aire)
 *   personas, m3hPorPersona, m3hPorM2: aire adicional por ocupantes (se suma al de renovaciones)
 *   entradaAire (por defecto true): si el local tiene entrada/aberturas de aire, el aire caliente sale por
 *     ellas y basta un inyector. Si es false, los modelos axiales (axial: true) se instalan en pareja:
 *     un inyector y un extractor, cada uno con el caudal requerido (el doble de unidades).
 *   nivelRuidoMax (opcional, 1–15): excluye modelos cuyo nivel de ruido (nivelRuidoDe) supere este valor
 *   preferirLinea (opcional): "domestica" | "industrial"; prioriza esa línea (hasta MAX_UNIDADES_PREFERIDA unidades)
 *   funcion (opcional): "cualquiera" (por defecto), "extraccion", "inyeccion" o "ambas"
 *     ("ambas": modelos que pueden las dos funciones, en pareja: un inyector + un extractor)
 *     (solo modelos con extraccion: true / inyeccion: true en el catálogo)
 * @param {Array} catalogo  lista de ventiladores (ver data/ventiladores.json)
 * @returns {null | {volumen, caudalRequerido, caudalRequeridoCfm, caudalRequeridoLps, opciones}}
 *   opciones viene ordenada: primero la que usa menos unidades; a igual número de
 *   unidades, la de menor exceso de caudal. Si la primera da más de TOLERANCIA_EXCESO de aire
 *   de más, pasa al frente una opción más ajustada (ver elegirAjustada).
 *   ajuste: { reemplaza } si se aplicó la tolerancia · sinAjuste: true si hacía falta pero no hubo opción.
 */
export function calcular(entrada, catalogo) {
  const {
    largo,
    ancho,
    alto,
    altoMin,
    renovaciones,
    voltaje = "Cualquiera",
    linea = "industrial",
    eficiencia = RENDIMIENTO_VENTILADOR,
    margen = 1,
    personas = 0,
    m3hPorPersona = 0,
    m3hPorM2 = 0,
    nivelRuidoMax = Infinity,
    funcion = "cualquiera",
    entradaAire = true,
    preferirLinea = null,
  } = entrada;

  if (![largo, ancho, alto, renovaciones].every((n) => Number.isFinite(n) && n > 0)) return null;
  if (!(eficiencia > 0)) return null;

  const altoUsado = Number.isFinite(altoMin) && altoMin > 0 ? (alto + altoMin) / 2 : alto;
  const volumen = largo * ancho * altoUsado;
  const caudalRenovaciones = volumen * renovaciones; // m³/h  (Q = V · R/H)
  // Aire adicional por ocupantes (aire exterior mínimo por persona + por m², tipo ASHRAE 62.1). Se suma al de renovaciones.
  const hayPersonas = Number.isFinite(personas) && personas > 0;
  const caudalPersonas = hayPersonas ? personas * m3hPorPersona + largo * ancho * m3hPorM2 : 0;
  const caudalRequerido = caudalRenovaciones + caudalPersonas;

  const cumpleLineaYVoltaje = (f) =>
    (linea === "todas" || (f.linea ?? "industrial") === linea) && (voltaje === "Cualquiera" || `${voltajeNominal(f)}V` === voltaje);

  // Ventiladores de confort (ej. UR-623, de techo): mueven el aire dentro del local pero no lo renuevan,
  // así que no cuentan para el caudal. Se devuelven aparte como complemento.
  const confort = catalogo.filter((f) => f.confort === true && cumpleLineaYVoltaje(f));

  const opciones = catalogo
    .filter((f) => f.confort !== true)
    .filter((f) => caudalCatalogoM3h(f) > 0)
    .filter(cumpleLineaYVoltaje)
    // Función requerida: solo modelos marcados para extraer / inyectar aire. "ambas" = el modelo debe poder hacer las dos.
    .filter((f) => funcion === "cualquiera" || (funcion === "ambas" ? f.extraccion === true && f.inyeccion === true : f[funcion] === true))
    // Límite de ruido por unidad (nivel 1–15). Sin dato de ruido no se puede garantizar el límite.
    .filter((f) => nivelRuidoMax === Infinity || (nivelRuidoDe(f) != null && nivelRuidoDe(f) <= nivelRuidoMax))
    .map((f) => {
      const caudalUnidad = caudalCatalogoM3h(f) * eficiencia; // m³/h reales por unidad
      // Unidades necesarias para mover el caudal requerido por un lado (inyección o extracción).
      const unidadesPorLado = Math.max(1, Math.ceil((caudalRequerido * margen) / caudalUnidad - 1e-9));
      // Sin entrada de aire, los axiales van en pareja: mismas unidades para inyectar y para extraer.
      const enPareja = funcion === "ambas" || (f.axial === true && entradaAire === false);
      const unidades = enPareja ? unidadesPorLado * 2 : unidadesPorLado;
      const caudalTotal = unidadesPorLado * caudalUnidad; // caudal de cada lado (no se suman)
      return {
        ...f,
        caudalUnidad,
        unidades,
        unidadesPorLado,
        enPareja,
        caudalTotal,
        caudalTotalCfm: caudalTotal * CFM_POR_M3H,
        caudalCatalogoCfm: unidadesPorLado * caudalCatalogoM3h(f) * CFM_POR_M3H, // 100 % de catálogo, por lado
        exceso: caudalTotal / caudalRequerido - 1,
        // Exceso contra el caudal pedido con la barra "Caudal a cubrir" (es el que usa la tolerancia).
        excesoPedido: caudalTotal / (caudalRequerido * margen) - 1,
        preferida: preferirLinea != null && (f.linea ?? "industrial") === preferirLinea && unidades <= MAX_UNIDADES_PREFERIDA,
        nivelRuido: nivelRuidoDe(f),
        potenciaTotalW: unidades * f.potenciaW,
        renovacionesReales: caudalTotal / volumen,
      };
    })
    .sort((a, b) => Number(b.preferida) - Number(a.preferida) || a.unidades - b.unidades || a.exceso - b.exceso);

  const { ajuste, sinAjuste } = elegirAjustada(opciones, preferirLinea);

  return {
    volumen,
    caudalRequerido,
    caudalRenovaciones,
    caudalPersonas,
    caudalRequeridoCfm: caudalRequerido * CFM_POR_M3H,
    caudalRequeridoLps: caudalRequerido * LPS_POR_M3H,
    opciones,
    confort,
    ajuste,
    sinAjuste,
  };
}

/**
 * Tolerancia de exceso. Si la primera opción (menos unidades) da más de TOLERANCIA_EXCESO de aire de más,
 * busca una más ajustada que cumpla todo esto:
 *   - exceso dentro de la tolerancia (medido contra el caudal pedido con la barra);
 *   - como máximo MAX_UNIDADES_EXTRA unidades más por lado;
 *   - como máximo MAX_AUMENTO_POTENCIA más de vatios en total;
 *   - misma prioridad de línea preferida (la preferencia doméstica sigue mandando);
 *   - en locales sin preferencia doméstica, no salta de un modelo industrial a uno doméstico.
 * Entre las que cumplen, elige la de menos unidades y, a igual número, la de menor exceso,
 * y la pone al frente de la lista (modifica opciones).
 */
function elegirAjustada(opciones, preferirLinea) {
  const primera = opciones[0];
  if (!primera || primera.excesoPedido <= TOLERANCIA_EXCESO) return { ajuste: null, sinAjuste: false };
  const esDomestica = (o) => (o.linea ?? "industrial") === "domestica";
  const candidatas = opciones
    .filter(
      (o) =>
        o !== primera &&
        o.excesoPedido >= 0 &&
        o.excesoPedido <= TOLERANCIA_EXCESO &&
        o.unidadesPorLado <= primera.unidadesPorLado + MAX_UNIDADES_EXTRA &&
        o.potenciaTotalW <= primera.potenciaTotalW * (1 + MAX_AUMENTO_POTENCIA) &&
        o.preferida === primera.preferida &&
        (preferirLinea === "domestica" || esDomestica(primera) || !esDomestica(o))
    )
    .sort((a, b) => a.unidades - b.unidades || a.exceso - b.exceso);
  const elegida = candidatas[0];
  if (!elegida) return { ajuste: null, sinAjuste: true };
  opciones.splice(opciones.indexOf(elegida), 1);
  opciones.unshift(elegida);
  return { ajuste: { reemplaza: primera }, sinAjuste: false };
}

/** Convierte texto del formulario ("4,5" o "4.5") en número; vacío o inválido → NaN. */
export function aNumero(texto) {
  if (typeof texto === "number") return texto;
  const limpio = String(texto ?? "").trim().replace(",", ".");
  return limpio === "" ? NaN : Number(limpio);
}

const fmt0 = (n) => new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(n);
const fmt1 = (n) => new Intl.NumberFormat("es-CR", { maximumFractionDigits: 1 }).format(n);

/**
 * Explicación en lenguaje sencillo de por qué se recomienda una opción, para que el vendedor
 * pueda contársela al cliente. Devuelve una lista de frases (vacía si no hay datos).
 * @param {object} p
 *   resultado: lo que devuelve calcular() · opcion: la opción mostrada como principal
 *   renovaciones: renovaciones por hora usadas · nivelRuidoMax: límite de ruido (Infinity = sin límite)
 *   nombreNivel(n): nombre del nivel de ruido en la escala (opcional)
 */
export function explicarEleccion({ resultado, opcion, renovaciones, nivelRuidoMax = Infinity, nombreNivel = () => "" }) {
  if (!resultado || !opcion || !resultado.opciones?.length) return [];
  const { volumen, caudalRequeridoCfm, caudalPersonas, opciones } = resultado;
  const recomendado = opciones[0];
  const esRecomendado = opcion.modelo === recomendado.modelo;
  const nombre = nombreDe(opcion);
  const lineas = [];

  // 1. Cuánto aire necesita el local.
  lineas.push(
    `El local tiene ${fmt0(volumen)} m³ y necesita renovar el aire ${fmt1(renovaciones)} veces por hora: ` +
      `${fmt0(caudalRequeridoCfm)} CFM${caudalPersonas > 0 ? ", incluido el aire para las personas" : ""}.`
  );

  // 2. Cuánto aire brindan las unidades recomendadas.
  const cobertura =
    opcion.exceso >= 0
      ? `${fmt0(opcion.exceso * 100)} % por encima de lo necesario`
      : `el ${fmt0((1 + opcion.exceso) * 100)} % de lo necesario (caudal a cubrir reducido)`;
  if (opcion.enPareja) {
    const u = opcion.unidadesPorLado;
    lineas.push(
      `Se instalan ${u} ${nombre} inyectando aire y ${u} extrayendo; cada lado mueve ${fmt0(opcion.caudalTotalCfm)} CFM reales ` +
        `(80 % del catálogo), ${cobertura}.`
    );
  } else {
    const verbo = opcion.unidades === 1 ? "mueve" : "mueven";
    lineas.push(`${opcion.unidades} ${nombre} ${verbo} ${fmt0(opcion.caudalTotalCfm)} CFM reales (80 % del catálogo), ${cobertura}.`);
  }

  // 3. Por qué esta opción y no otra.
  if (!esRecomendado) {
    lineas.push(`Opción elegida manualmente. La recomendada por la calculadora es ${nombreDe(recomendado)} × ${recomendado.unidades}.`);
  } else if (resultado.ajuste) {
    const otra = resultado.ajuste.reemplaza;
    lineas.push(
      `Se prefirió sobre ${nombreDe(otra)} × ${otra.unidades}, que da ${fmt0(otra.exceso * 100)} % de aire de más: ` +
        "esta opción queda más ajustada a lo que necesita el local, sin sobredimensionar."
    );
  } else if (opcion.preferida) {
    lineas.push("Para este tipo de local se prefiere la línea doméstica, porque es más fácil de instalar.");
  } else {
    const empatadas = opciones.filter((o) => o !== opcion && o.unidades === opcion.unidades).length;
    lineas.push(
      empatadas > 0
        ? `Es la opción que cubre el caudal con menos equipos y, entre las de ${opcion.unidades} ${opcion.unidades === 1 ? "unidad" : "unidades"}, la más ajustada a la necesidad.`
        : "Es la opción que cubre el caudal con menos equipos."
    );
  }
  if (esRecomendado && resultado.sinAjuste) {
    lineas.push("Da bastante aire de más, pero el catálogo no tiene una opción más ajustada con las condiciones elegidas.");
  }

  // 4. Ruido.
  if (opcion.nivelRuido != null) {
    const nombreRuido = nombreNivel(opcion.nivelRuido);
    const ruido = `Ruido nivel ${opcion.nivelRuido} de 15${nombreRuido ? ` (${nombreRuido.toLowerCase()})` : ""}`;
    lineas.push(
      Number.isFinite(nivelRuidoMax)
        ? `${ruido}, dentro del límite de nivel ${nivelRuidoMax} para las personas que estarán en el local.`
        : `${ruido}. No se aplicó límite de ruido porque no se indicaron personas en el local.`
    );
  }

  // 5. Consumo y conexión eléctrica.
  lineas.push(
    `Consumo total: ${fmt0(opcion.potenciaTotalW)} W a ${opcion.voltaje} V.` +
      (opcion.voltaje === 220 ? " Requiere conexión de 220 V en el local." : "")
  );

  // 6. Alternativa por si el cliente prefiere otra cosa.
  if (esRecomendado) {
    const siguiente = opciones.find((o) => o !== opcion);
    if (siguiente) lineas.push(`Alternativa: ${nombreDe(siguiente)} × ${siguiente.unidades} (${fmt0(siguiente.exceso * 100)} % sobre lo necesario).`);
  }

  return lineas;
}
