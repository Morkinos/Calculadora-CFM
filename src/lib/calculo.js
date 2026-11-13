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

// Domésticos sin entrada de aire: les cuesta más mover el aire, así que se les pide este factor más de caudal (1,25 = 25 % más).
export const FACTOR_DOMESTICO_SIN_ENTRADA = 1.25;
// Ventiladores de techo (campo "techo": true, ej. UR-623): en espacios de más de estos m² de piso no pueden ser
// la primera opción por el tipo de instalación (en aulas se prefieren los de pared, como VP-16C o VP-16CR).
export const AREA_MAX_TECHO_M2 = 30;
// Más personas = más calor: al menos 1 ventilador por cada tantas personas (no aplica a los axiales,
// que renuevan el aire del local en vez de refrescar a las personas).
export const PERSONAS_POR_VENTILADOR = 10;

/** Nivel de ruido (1–15) equivalente a un valor en dB: cada nivel agrupa 5 dB (nivel 1 = hasta 35 dB; 15 = más de 100). */
export const nivelDeDb = (db) => Math.min(15, Math.max(1, Math.ceil((db - 30) / 5)));

/**
 * Nivel de ruido percibido (1–15) de un modelo. Se usa `nivelRuido` (escala de VEGGA, editable en
 * ventiladores.json); si no existe, se convierte el ruido máximo del catálogo. Sin ningún dato → null.
 */
export const nivelRuidoDe = (f) => f.nivelRuido ?? (f.ruidoMax != null ? nivelDeDb(f.ruidoMax) : null);

/** Nombre que se muestra al usuario: solo el modelo (ej. "50T-W", "AIP-60"). */
export const nombreDe = (f) => f.nombreMostrado ?? f.modelo;
/** Nombre comercial (el que entiende el cliente), o el código del modelo si no tiene. */
export const nombreVenta = (f) => f.nombreComercial ?? nombreDe(f);
/** Nombre comercial con el código entre paréntesis, para textos: «Pie 20" (50T-S)». */
export const etiquetaVenta = (f) => (f.nombreComercial ? `${f.nombreComercial} (${nombreDe(f)})` : nombreDe(f));

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
    // Cobertura en m² de la ficha: "no" (solo CFM), "domesticos" o "todos" los modelos que tienen coberturaM2.
    usarCobertura = "no",
    // Tipo de ventilador según su instalación: "cualquiera" | "pared" | "piso" | "techo" (campo "montaje" del catálogo).
    montaje = "cualquiera",
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

  const area = largo * ancho;

  const opciones = catalogo
    .filter((f) => caudalCatalogoM3h(f) > 0)
    .filter(cumpleLineaYVoltaje)
    .filter((f) => montaje === "cualquiera" || (f.montaje ?? []).includes(montaje))
    // Función requerida: solo modelos marcados para extraer / inyectar aire. "ambas" = el modelo debe poder hacer las dos.
    .filter((f) => funcion === "cualquiera" || (funcion === "ambas" ? f.extraccion === true && f.inyeccion === true : f[funcion] === true))
    // Límite de ruido por unidad (nivel 1–15). Sin dato de ruido no se puede garantizar el límite.
    .filter((f) => nivelRuidoMax === Infinity || (nivelRuidoDe(f) != null && nivelRuidoDe(f) <= nivelRuidoMax))
    .map((f) => {
      const caudalUnidad = caudalCatalogoM3h(f) * eficiencia; // m³/h reales por unidad
      // Domésticos sin entrada de aire: se les pide más caudal porque les cuesta más mover el aire.
      const factorSinEntrada = entradaAire === false && (f.linea ?? "industrial") === "domestica" ? FACTOR_DOMESTICO_SIN_ENTRADA : 1;
      const requeridoModelo = caudalRequerido * factorSinEntrada; // m³/h que se le pide a este modelo
      // Unidades necesarias para mover el caudal requerido por un lado (inyección o extracción).
      // Unidades por caudal (CFM) y, si aplica, por área cubierta (m² del piso ÷ cobertura del modelo según su ficha).
      const unidadesPorCaudal = Math.max(1, Math.ceil((requeridoModelo * margen) / caudalUnidad - 1e-9));
      const aplicaCobertura =
        f.coberturaM2 > 0 && (usarCobertura === "todos" || (usarCobertura === "domesticos" && (f.linea ?? "industrial") === "domestica"));
      const unidadesPorArea = aplicaCobertura ? Math.ceil(area / f.coberturaM2 - 1e-9) : 0;
      // Mínimo por personas: más gente genera más calor (ej. 30 estudiantes → al menos 3 ventiladores).
      const unidadesPorPersonas = hayPersonas && !f.axial ? Math.ceil(personas / PERSONAS_POR_VENTILADOR - 1e-9) : 0;
      const unidadesPorLado = Math.max(unidadesPorCaudal, unidadesPorArea, unidadesPorPersonas);
      // Sin entrada de aire, los axiales van en pareja: mismas unidades para inyectar y para extraer.
      const enPareja = funcion === "ambas" || (f.axial === true && entradaAire === false);
      const unidades = enPareja ? unidadesPorLado * 2 : unidadesPorLado;
      const caudalTotal = unidadesPorLado * caudalUnidad; // caudal de cada lado (no se suman)
      return {
        ...f,
        caudalUnidad,
        unidades,
        unidadesPorLado,
        unidadesPorCaudal,
        unidadesPorArea,
        unidadesPorPersonas,
        enPareja,
        caudalTotal,
        caudalTotalCfm: caudalTotal * CFM_POR_M3H,
        caudalCatalogoCfm: unidadesPorLado * caudalCatalogoM3h(f) * CFM_POR_M3H, // 100 % de catálogo, por lado
        factorSinEntrada,
        requeridoCfm: requeridoModelo * CFM_POR_M3H,
        exceso: caudalTotal / requeridoModelo - 1,
        // Exceso contra el caudal pedido con la barra "Caudal a cubrir" (es el que usa la tolerancia).
        excesoPedido: caudalTotal / (requeridoModelo * margen) - 1,
        // De techo en un espacio grande: queda al final de la lista (no puede ser la recomendada si hay otra opción).
        // Si el vendedor pidió ventiladores de techo, no se relegan.
        relegado: f.techo === true && area > AREA_MAX_TECHO_M2 && montaje !== "techo",
        preferida: preferirLinea != null && (f.linea ?? "industrial") === preferirLinea && unidades <= MAX_UNIDADES_PREFERIDA,
        nivelRuido: nivelRuidoDe(f),
        potenciaTotalW: unidades * f.potenciaW,
        renovacionesReales: caudalTotal / volumen,
      };
    })
    .sort(
      (a, b) =>
        Number(a.relegado) - Number(b.relegado) ||
        Number(b.preferida) - Number(a.preferida) ||
        a.unidades - b.unidades ||
        a.exceso - b.exceso
    );

  const { ajuste, sinAjuste } = elegirAjustada(opciones, preferirLinea);

  return {
    volumen,
    caudalRequerido,
    caudalRenovaciones,
    caudalPersonas,
    caudalRequeridoCfm: caudalRequerido * CFM_POR_M3H,
    caudalRequeridoLps: caudalRequerido * LPS_POR_M3H,
    area,
    personas: hayPersonas ? personas : 0,
    opciones,
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
  // Si la cantidad la define el área cubierta o la cantidad de personas (no el caudal), el aire de más es inevitable:
  // no se busca otra opción.
  if (primera.unidadesPorLado > primera.unidadesPorCaudal) return { ajuste: null, sinAjuste: false };
  const esDomestica = (o) => (o.linea ?? "industrial") === "domestica";
  const candidatas = opciones
    .filter(
      (o) =>
        o !== primera &&
        !o.relegado &&
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

/** Cómo se maneja el ventilador, en frase: "es de cordón" o "tiene control remoto". */
function fraseControl(control) {
  return control === "cordón" ? "es de cordón" : `tiene ${control}`;
}

/** Tipo y control juntos: "de pared con control remoto", "de pared de cordón", "de pie con perilla". */
export function descripcionModelo(f) {
  if (!f?.tipo) return "";
  if (!f.control) return f.tipo;
  return f.control === "cordón" ? `${f.tipo} de cordón` : `${f.tipo} con ${f.control}`;
}

/** Ruido en palabras, para explicarlo al cliente sin el número de la escala: bajo (1-4), medio (5-8), alto (9-11) o muy alto (12-15). */
export function descripcionRuido(nivel) {
  if (nivel <= 4) return "bajo";
  if (nivel <= 8) return "medio";
  if (nivel <= 11) return "alto";
  return "muy alto";
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
  const nombre = etiquetaVenta(opcion); // nombre comercial + código, para el cliente
  const codigo = nombreDe(opcion); // solo el código, para frases cortas
  const lineas = [];

  // 1. Cuánto aire necesita el local.
  lineas.push(
    `El local tiene ${fmt0(volumen)} m³ y necesita renovar el aire ${fmt1(renovaciones)} veces por hora: ` +
      `${fmt0(caudalRequeridoCfm)} CFM${caudalPersonas > 0 ? ", incluido el aire para las personas" : ""}.`
  );

  // 2. Cuánto aire brindan las unidades recomendadas.
  // ¿La cantidad la define algo distinto del caudal (área cubierta o personas)?
  const porArea = (o) => o.unidadesPorLado > o.unidadesPorCaudal;
  const cobertura = porArea(opcion)
    ? `más que los ${fmt0(opcion.requeridoCfm ?? caudalRequeridoCfm)} CFM que necesita el local`
    : opcion.exceso >= 0
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

  // 2b. Si la cantidad la define el área que cubre cada ventilador (dato de la ficha) o la cantidad de personas.
  const manda = porArea(opcion) ? (opcion.unidadesPorArea >= opcion.unidadesPorPersonas ? "area" : "personas") : null;
  if (manda === "personas") {
    lineas.push(
      `Hay ${fmt0(resultado.personas)} personas en el local, y más personas generan más calor: se recomienda al menos 1 ventilador ` +
        `por cada ${PERSONAS_POR_VENTILADOR} personas, así que hacen falta ${opcion.unidadesPorPersonas} ` +
        `(por caudal bastaba${opcion.unidadesPorCaudal === 1 ? "" : "n"} ${opcion.unidadesPorCaudal}).`
    );
  }
  if (manda === "area") {
    lineas.push(
      `Cada ${codigo} cubre unos ${fmt1(opcion.coberturaM2)} m² y el local mide ${fmt0(resultado.area)} m², así que hacen falta ${opcion.unidadesPorArea} ` +
        `para que el aire llegue a todo el espacio (por caudal bastaba${opcion.unidadesPorCaudal === 1 ? "" : "n"} ${opcion.unidadesPorCaudal}).`
    );
  }

  // 3. Por qué esta opción y no otra.
  if (!esRecomendado) {
    lineas.push(`Opción elegida manualmente. La recomendada por la calculadora es ${etiquetaVenta(recomendado)} × ${recomendado.unidades}.`);
  } else if (resultado.ajuste) {
    const otra = resultado.ajuste.reemplaza;
    lineas.push(
      `Se prefirió sobre ${etiquetaVenta(otra)} × ${otra.unidades}, que da ${fmt0(otra.exceso * 100)} % de aire de más: ` +
        "esta opción queda más ajustada a lo que necesita el local, sin sobredimensionar."
    );
  } else if (opcion.preferida) {
    lineas.push(opcion.tipo ? `Es un ventilador ${descripcionModelo(opcion)}, fácil de instalar.` : "Es un modelo fácil de instalar.");
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

  if (opcion.factorSinEntrada > 1) {
    lineas.push(
      `Como el local no tiene entrada de aire, a los ventiladores domésticos se les pide ${fmt0((opcion.factorSinEntrada - 1) * 100)} % más de caudal ` +
        `(${fmt0(opcion.requeridoCfm)} CFM), porque les cuesta más mover el aire.`
    );
  }
  if (opcion.techo) {
    lineas.push(
      opcion.relegado
        ? `Es un ventilador de techo: en espacios de más de ${AREA_MAX_TECHO_M2} m² se prefieren otros por la instalación, pero también se puede usar si el cielo raso lo permite.`
        : "Es un ventilador de techo: requiere instalación en el cielo raso. Ideal para espacios pequeños como habitaciones, cabinas u hostels."
    );
  }

  // 4. Ruido, en palabras (sin el número de la escala).
  if (opcion.nivelRuido != null) {
    const ruido = `Nivel de ruido ${descripcionRuido(opcion.nivelRuido)}`;
    lineas.push(
      Number.isFinite(nivelRuidoMax)
        ? `${ruido}, adecuado para las personas que estarán en el local.`
        : `${ruido}. No se limitó el ruido porque no se indicaron personas en el local.`
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
    if (siguiente) {
      let alternativa = porArea(siguiente)
        ? `Alternativa: ${etiquetaVenta(siguiente)} × ${siguiente.unidades}.`
        : `Alternativa: ${etiquetaVenta(siguiente)} × ${siguiente.unidades} (${fmt0(siguiente.exceso * 100)} % sobre lo necesario).`;
      // Diferencia según el tipo y el control del catálogo (ej. VP-16C de pared de cordón, VP-16CR de pared con control remoto).
      if (opcion.tipo && siguiente.tipo && opcion.tipo !== siguiente.tipo) {
        alternativa += ` La diferencia es que el ${nombreDe(siguiente)} es ${descripcionModelo(siguiente)} y el ${codigo} es ${descripcionModelo(opcion)}.`;
      } else if (opcion.control && siguiente.control && opcion.control !== siguiente.control) {
        alternativa += ` La diferencia es que el ${nombreDe(siguiente)} ${fraseControl(siguiente.control)} y el ${codigo} ${fraseControl(opcion.control)}.`;
      }
      lineas.push(alternativa);
    }
  }

  return lineas;
}

// Filtros que se prueban, uno a la vez, cuando ningún modelo cumple todo junto.
// motivo: por qué no se puede calcular · accion: qué modificar (el orden define cuál se menciona primero).
const AJUSTES_DIAGNOSTICO = [
  { clave: "nivelRuidoMax", libre: Infinity, motivo: "el nivel de ruido es muy bajo y no cumple las condiciones", accion: "el nivel de ruido" },
  { clave: "voltaje", libre: "Cualquiera", motivo: "la conexión eléctrica elegida no tiene modelos que cumplan las condiciones", accion: "la conexión eléctrica" },
  { clave: "funcion", libre: "cualquiera", motivo: "el alcance requerido no tiene modelos que cumplan las condiciones", accion: "el alcance requerido" },
  { clave: "montaje", libre: "cualquiera", motivo: "el tipo de ventilador elegido no tiene modelos que cumplan las condiciones", accion: "el tipo de ventilador" },
  { clave: "linea", libre: "todas", motivo: "la línea de ventiladores elegida no tiene modelos que cumplan las condiciones", accion: "la línea de ventiladores" },
];

/**
 * Cuando ningún modelo cumple todos los filtros a la vez, prueba quitando uno por uno
 * (ruido, voltaje, alcance y línea) y devuelve los cambios que sí darían una recomendación,
 * con el motivo, qué modificar y el modelo que se recomendaría: [{ motivo, accion, opcion }].
 */
export function diagnosticarSinOpciones(entrada, catalogo) {
  const sugerencias = [];
  for (const a of AJUSTES_DIAGNOSTICO) {
    if ((entrada[a.clave] ?? a.libre) === a.libre) continue; // ese filtro no está activo
    const r = calcular({ ...entrada, [a.clave]: a.libre }, catalogo);
    if (r?.opciones.length) sugerencias.push({ motivo: a.motivo, accion: a.accion, opcion: r.opciones[0] });
  }
  return sugerencias;
}
