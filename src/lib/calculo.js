// Lógica de cálculo (sin React, para poder probarla aparte).

export const CFM_POR_M3H = 0.5886; // 1 m³/h = 0.5886 CFM
export const LPS_POR_M3H = 1 / 3.6; // 1 m³/h = 0.2778 l/s

// Rendimiento real supuesto de un ventilador respecto a su caudal de catálogo (instalación, rejillas, etc.).
export const RENDIMIENTO_VENTILADOR = 0.8;

/**
 * Convierte el "caudal a cubrir" de la página (65 % a 125 %, 100 % por defecto) en el factor que se
 * aplica al caudal de catálogo. 100 % = caudal requerido con el rendimiento del 80 %; más de 100 %
 * pide un poco más de aire (más ventiladores o un modelo mayor); menos de 100 %, un poco menos.
 */
export const eficienciaDe = (coberturaPct) => RENDIMIENTO_VENTILADOR / (coberturaPct / 100);

// Si el tipo de local prefiere una línea (ej. doméstica, más fácil de instalar), sus modelos van primero
// siempre que no necesiten más de este número de unidades; si necesitan más, gana el criterio normal.
export const MAX_UNIDADES_PREFERIDA = 6;

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
 *   eficiencia (0.3 a 1.5): caudal real = caudal de catálogo × eficiencia (ver eficienciaDe)
 *   entradaAire (por defecto true): si el local tiene entrada/aberturas de aire, el aire caliente sale por
 *     ellas y basta un inyector. Si es false, los modelos axiales (axial: true) se instalan en pareja:
 *     un inyector y un extractor, cada uno con el caudal requerido (el doble de unidades).
 *   ruidoMaxDb (opcional): excluye modelos cuyo ruido máximo por unidad supere este valor
 *   preferirLinea (opcional): "domestica" | "industrial"; prioriza esa línea (hasta MAX_UNIDADES_PREFERIDA unidades)
 *   funcion (opcional): "cualquiera" (por defecto), "extraccion" o "inyeccion"
 *     (solo modelos con extraccion: true / inyeccion: true en el catálogo)
 * @param {Array} catalogo  lista de ventiladores (ver data/ventiladores.json)
 * @returns {null | {volumen, caudalRequerido, caudalRequeridoCfm, caudalRequeridoLps, opciones}}
 *   opciones viene ordenada: primero la que usa menos unidades; a igual número de
 *   unidades, la de menor exceso de caudal (la más ajustada a la necesidad).
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
    eficiencia = 1,
    ruidoMaxDb = Infinity,
    funcion = "cualquiera",
    entradaAire = true,
    preferirLinea = null,
  } = entrada;

  if (![largo, ancho, alto, renovaciones].every((n) => Number.isFinite(n) && n > 0)) return null;
  if (!(eficiencia > 0)) return null;

  const altoUsado = Number.isFinite(altoMin) && altoMin > 0 ? (alto + altoMin) / 2 : alto;
  const volumen = largo * ancho * altoUsado;
  const caudalRequerido = volumen * renovaciones; // m³/h  (Q = V · R/H)

  const opciones = catalogo
    .filter((f) => caudalCatalogoM3h(f) > 0)
    .filter((f) => linea === "todas" || (f.linea ?? "industrial") === linea)
    .filter((f) => voltaje === "Cualquiera" || `${voltajeNominal(f)}V` === voltaje)
    // Función requerida: solo modelos marcados para extraer / inyectar aire.
    .filter((f) => funcion === "cualquiera" || f[funcion] === true)
    // Límite de ruido por unidad (dB a velocidad máxima). Sin dato de ruido no se puede garantizar el límite.
    .filter((f) => ruidoMaxDb === Infinity || (f.ruidoMax != null && f.ruidoMax <= ruidoMaxDb))
    .map((f) => {
      const caudalUnidad = caudalCatalogoM3h(f) * eficiencia; // m³/h reales por unidad
      // Unidades necesarias para mover el caudal requerido por un lado (inyección o extracción).
      const unidadesPorLado = Math.max(1, Math.ceil(caudalRequerido / caudalUnidad - 1e-9));
      // Sin entrada de aire, los axiales van en pareja: mismas unidades para inyectar y para extraer.
      const enPareja = f.axial === true && entradaAire === false;
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
        exceso: caudalTotal / caudalRequerido - 1,
        preferida: preferirLinea != null && (f.linea ?? "industrial") === preferirLinea && unidades <= MAX_UNIDADES_PREFERIDA,
        potenciaTotalW: unidades * f.potenciaW,
        renovacionesReales: caudalTotal / volumen,
      };
    })
    .sort((a, b) => Number(b.preferida) - Number(a.preferida) || a.unidades - b.unidades || a.exceso - b.exceso);

  return {
    volumen,
    caudalRequerido,
    caudalRequeridoCfm: caudalRequerido * CFM_POR_M3H,
    caudalRequeridoLps: caudalRequerido * LPS_POR_M3H,
    opciones,
  };
}

/** Convierte texto del formulario ("4,5" o "4.5") en número; vacío o inválido → NaN. */
export function aNumero(texto) {
  if (typeof texto === "number") return texto;
  const limpio = String(texto ?? "").trim().replace(",", ".");
  return limpio === "" ? NaN : Number(limpio);
}
