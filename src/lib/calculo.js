// Lógica de cálculo (sin React, para poder probarla aparte).

export const CFM_POR_M3H = 0.5886;

/** Nombre que se muestra al usuario: solo el modelo (ej. "50T-W", "AIP-600"). */
export const nombreDe = (f) => f.nombreMostrado ?? f.modelo;

/**
 * @param {object} entrada
 *   largo, ancho, alto (m) · renovaciones (por hora) · voltaje ("Cualquiera" | "110V" | "220V")
 *   eficiencia (0.3 a 1): caudal real = caudal de catálogo × eficiencia
 *   ruidoMaxDb (opcional): excluye modelos cuyo ruido máximo por unidad supere este valor
 *   funcion (opcional): "cualquiera" (por defecto) o "extraccion" (solo modelos con extraccion: true)
 * @param {Array} catalogo  lista de ventiladores (ver data/ventiladores.json)
 * @returns {null | {volumen, caudalRequerido, caudalRequeridoCfm, opciones}}
 *   opciones viene ordenada: primero la que usa menos unidades; a igual número de
 *   unidades, la de menor exceso de caudal (la más ajustada a la necesidad).
 */
export function calcular(entrada, catalogo) {
  const { largo, ancho, alto, renovaciones, voltaje = "Cualquiera", eficiencia = 1, ruidoMaxDb = Infinity, funcion = "cualquiera" } = entrada;
  const volumen = largo * ancho * alto;
  const caudalRequerido = volumen * renovaciones;
  if (![largo, ancho, alto, renovaciones].every((n) => Number.isFinite(n) && n > 0)) return null;
  if (!(eficiencia > 0)) return null;

  const opciones = catalogo
    .filter((f) => f.caudalM3min > 0)
    .filter((f) => voltaje === "Cualquiera" || `${f.voltaje}V` === voltaje)
    // Función requerida: "extraccion" = solo modelos que sirven para extraer / expulsar aire.
    .filter((f) => funcion !== "extraccion" || f.extraccion === true)
    // Límite de ruido por unidad (dB a velocidad máxima). Sin dato de ruido no se puede garantizar el límite.
    .filter((f) => ruidoMaxDb === Infinity || (f.ruidoMax != null && f.ruidoMax <= ruidoMaxDb))
    .map((f) => {
      const caudalUnidad = f.caudalM3min * 60 * eficiencia; // m³/h reales por unidad
      const unidades = Math.max(1, Math.ceil(caudalRequerido / caudalUnidad - 1e-9));
      const caudalTotal = unidades * caudalUnidad;
      return {
        ...f,
        caudalUnidad,
        unidades,
        caudalTotal,
        exceso: caudalTotal / caudalRequerido - 1,
        potenciaTotalW: unidades * f.potenciaW,
        renovacionesReales: caudalTotal / volumen,
      };
    })
    .sort((a, b) => a.unidades - b.unidades || a.exceso - b.exceso);

  return {
    volumen,
    caudalRequerido,
    caudalRequeridoCfm: caudalRequerido * CFM_POR_M3H,
    opciones,
  };
}

/** Convierte texto del formulario ("4,5" o "4.5") en número; vacío o inválido → NaN. */
export function aNumero(texto) {
  if (typeof texto === "number") return texto;
  const limpio = String(texto ?? "").trim().replace(",", ".");
  return limpio === "" ? NaN : Number(limpio);
}
