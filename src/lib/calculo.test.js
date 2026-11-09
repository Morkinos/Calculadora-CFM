import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nivelDeDb, nivelRuidoDe, calcular, aNumero, nombreDe, renovacionesDe, explicarEleccion, diagnosticarSinOpciones, descripcionModelo } from "./calculo.js";

const catalogo = JSON.parse(readFileSync(new URL("../data/ventiladores.json", import.meta.url)));

const mejor = (r) => `${r.opciones[0].modelo} x${r.opciones[0].unidades}`;

test("taller 20x10x5, 10 ren/h, 80% → DF600 x1", () => {
  const r = calcular({ largo: 20, ancho: 10, alto: 5, renovaciones: 10, eficiencia: 0.8 }, catalogo);
  assert.equal(r.volumen, 1000);
  assert.equal(r.caudalRequerido, 10000);
  assert.equal(mejor(r), "DF600 x1");
});

test("oficina pequeña 4x3x2.6, 6 ren/h → XDF-45 x1", () => {
  const r = calcular({ largo: 4, ancho: 3, alto: 2.6, renovaciones: 6, eficiencia: 0.8 }, catalogo);
  assert.equal(mejor(r), "XDF-45 x1");
});

test("nave 100x50x10, 8 ren/h → AXIAL 12,5 x12", () => {
  const r = calcular({ largo: 100, ancho: 50, alto: 10, renovaciones: 8, eficiencia: 0.8 }, catalogo);
  assert.equal(mejor(r), "AXIAL 12,5 x12");
});

test("filtro 220V, 4800 m³ a 10 ren/h → AXIAL 9,5 x2 y solo hay 2 opciones", () => {
  const r = calcular({ largo: 30, ancho: 20, alto: 8, renovaciones: 10, voltaje: "220V", eficiencia: 0.8 }, catalogo);
  assert.equal(mejor(r), "AXIAL 9,5 x2");
  assert.equal(r.opciones.length, 2);
});

test("cocina 4800 m³, 20 ren/h, 110V, 100% → DF750 x5", () => {
  const r = calcular({ largo: 30, ancho: 20, alto: 8, renovaciones: 20, voltaje: "120V", eficiencia: 1 }, catalogo);
  assert.equal(mejor(r), "DF750 x5");
});

test("límite de ruido nivel 7: solo modelos de nivel ≤ 7 (los domésticos); ningún axial", () => {
  const r = calcular({ largo: 20, ancho: 10, alto: 5, renovaciones: 8, eficiencia: 0.8, linea: "todas", nivelRuidoMax: 7 }, catalogo);
  assert.ok(r.opciones.length > 0 && r.opciones.every((o) => o.nivelRuido <= 7));
  assert.ok(!r.opciones.some((o) => o.axial));
});

test("límite de ruido nivel 10 excluye los AXIAL y el AIP-600, pero deja AIP-500, DF600, DF750, 50-FQ y 50T-W", () => {
  const r = calcular({ largo: 20, ancho: 10, alto: 5, renovaciones: 10, eficiencia: 0.8, linea: "industrial", nivelRuidoMax: 10 }, catalogo);
  const nombres = r.opciones.map((o) => o.modelo);
  assert.ok(!nombres.includes("AXIAL 9,5") && !nombres.includes("AXIAL 12,5") && !nombres.some((n) => n.includes("AIP60")));
  assert.ok(["FAD50-4 (AIP50)", "DF600", "DF750", "50-FQ", "50T-W"].every((n) => nombres.includes(n)));
});

test("límite de ruido imposible → sin opciones", () => {
  const r = calcular({ largo: 10, ancho: 10, alto: 3, renovaciones: 6, nivelRuidoMax: 1 }, catalogo);
  assert.equal(r.opciones.length, 0);
});

test("función extracción: solo modelos con extraccion=true", () => {
  const r = calcular({ largo: 20, ancho: 10, alto: 5, renovaciones: 10, eficiencia: 0.8, funcion: "extraccion" }, catalogo);
  assert.ok(r.opciones.length > 0 && r.opciones.every((o) => o.extraccion === true));
  assert.ok(!r.opciones.some((o) => o.modelo === "DF600"));
});

test("extracción + 110V + nivel ≤ 13 → solo los AIP", () => {
  const r = calcular(
    { largo: 20, ancho: 10, alto: 5, renovaciones: 10, eficiencia: 0.8, funcion: "extraccion", voltaje: "120V", nivelRuidoMax: 13 },
    catalogo
  );
  assert.deepEqual(r.opciones.map((o) => nombreDe(o)).sort(), ["AIP-500", "AIP-600"]);
});

test("nombre mostrado: solo el modelo", () => {
  assert.equal(nombreDe({ modelo: "50T-W" }), "50T-W");
  assert.equal(nombreDe({ modelo: "FAD60-4 (AIP60)", nombreMostrado: "AIP-600" }), "AIP-600");
});

test("ejemplo DIN 1946 de la lámina: almacén 5x10x20, 7 ren/h → 1000 m³ y 7000 m³/h", () => {
  const r = calcular({ largo: 20, ancho: 10, alto: 5, renovaciones: 7, eficiencia: 1 }, catalogo);
  assert.equal(r.volumen, 1000);
  assert.equal(r.caudalRequerido, 7000);
  assert.ok(Math.abs(r.caudalRequeridoCfm - 4120.2) < 0.1);
  assert.ok(Math.abs(r.caudalRequeridoLps - 1944.4) < 0.1);
});

test("altura mínima: techo inclinado usa el promedio de alturas", () => {
  const r = calcular({ largo: 20, ancho: 10, alto: 6, altoMin: 4, renovaciones: 10 }, catalogo);
  assert.equal(r.volumen, 1000);
  const sin = calcular({ largo: 20, ancho: 10, alto: 6, renovaciones: 10 }, catalogo);
  assert.equal(sin.volumen, 1200);
});

test("nivel de calor: bajo = mínimo, medio = media, alto = máximo", () => {
  const taller = { min: 15, max: 30 };
  assert.equal(renovacionesDe(taller, "bajo"), 15);
  assert.equal(renovacionesDe(taller, "alto"), 30);
  assert.equal(renovacionesDe(taller, "medio"), 22.5);
  const almacen = { min: 5, max: 10, media: 7 };
  assert.equal(renovacionesDe(almacen, "medio"), 7);
  assert.equal(renovacionesDe(almacen, "min"), 5);
});

test("más calor con las mismas medidas → más caudal requerido y más unidades", () => {
  const almacen = { min: 5, max: 10, media: 7 };
  const base = { largo: 50, ancho: 20, alto: 6, eficiencia: 0.8, voltaje: "120V" };
  const bajo = calcular({ ...base, renovaciones: renovacionesDe(almacen, "bajo") }, catalogo);
  const alto = calcular({ ...base, renovaciones: renovacionesDe(almacen, "alto") }, catalogo);
  assert.ok(alto.caudalRequerido > bajo.caudalRequerido);
  assert.ok(alto.opciones[0].unidades >= bajo.opciones[0].unidades);
});

test("CFM total por opción = m³/h × 0.5886", () => {
  const r = calcular({ largo: 20, ancho: 10, alto: 5, renovaciones: 10, eficiencia: 0.8 }, catalogo);
  const o = r.opciones[0];
  assert.ok(Math.abs(o.caudalTotalCfm - o.caudalTotal * 0.5886) < 1e-6);
});

test("con entrada de aire: axial = solo inyector (sin pareja)", () => {
  const r = calcular({ largo: 30, ancho: 20, alto: 8, renovaciones: 10, eficiencia: 0.8, voltaje: "220V", entradaAire: true }, catalogo);
  const o = r.opciones[0];
  assert.equal(o.modelo, "AXIAL 9,5");
  assert.equal(o.unidades, 2);
  assert.equal(o.enPareja, false);
});

test("sin entrada de aire: axial va en pareja (inyector + extractor = doble de unidades)", () => {
  const r = calcular({ largo: 30, ancho: 20, alto: 8, renovaciones: 10, eficiencia: 0.8, voltaje: "220V", entradaAire: false }, catalogo);
  const o = r.opciones[0];
  assert.equal(o.modelo, "AXIAL 9,5");
  assert.equal(o.unidadesPorLado, 2);
  assert.equal(o.unidades, 4);
  assert.equal(o.enPareja, true);
  assert.equal(o.potenciaTotalW, 4 * 750);
  // el caudal por lado no se suma: sigue siendo el de las 2 unidades de cada lado
  assert.ok(Math.abs(o.caudalTotal - 2 * (18705 / 0.5886) * 0.8) < 1e-6);
});

test("sin entrada de aire: modelos no axiales no se duplican", () => {
  const r = calcular({ largo: 20, ancho: 10, alto: 5, renovaciones: 10, eficiencia: 0.8, voltaje: "120V", entradaAire: false }, catalogo);
  const df600 = r.opciones.find((o) => o.modelo === "DF600");
  assert.equal(df600.enPareja, false);
  assert.equal(df600.unidades, 1);
});

test("datos incompletos → null", () => {
  assert.equal(calcular({ largo: 10, ancho: NaN, alto: 3, renovaciones: 6 }, catalogo), null);
  assert.equal(calcular({ largo: 10, ancho: 5, alto: 3, renovaciones: 0 }, catalogo), null);
});

test("aNumero acepta coma decimal", () => {
  assert.equal(aNumero("4,5"), 4.5);
  assert.ok(Number.isNaN(aNumero("")));
});

test("caudal a cubrir (margen): 125% pide más unidades que 100%, y el caudal brindado supera el requerido", () => {
  const base = { largo: 20, ancho: 10, alto: 5, renovaciones: 10, eficiencia: 0.8 };
  const a = calcular({ ...base, margen: 1 }, catalogo).opciones.find((o) => o.modelo === "DF750");
  const b = calcular({ ...base, margen: 1.25 }, catalogo).opciones.find((o) => o.modelo === "DF750");
  assert.ok(b.unidades >= a.unidades);
  const r = calcular({ ...base, margen: 1.25 }, catalogo);
  assert.ok(r.opciones.every((o) => o.caudalTotal >= r.caudalRequerido * 1.25 - 1e-6));
});
test("línea doméstica solo trae modelos domésticos; industrial no los incluye", () => {
  const base = { largo: 4, ancho: 3, alto: 2.6, renovaciones: 6, eficiencia: 0.8 };
  const d = calcular({ ...base, linea: "domestica" }, catalogo);
  assert.ok(d.opciones.length > 0 && d.opciones.every((o) => o.linea === "domestica"));
  const i = calcular(base, catalogo);
  assert.ok(i.opciones.every((o) => o.linea === "industrial"));
  const t = calcular({ ...base, linea: "todas" }, catalogo);
  assert.equal(t.opciones.length, d.opciones.length + i.opciones.length);
});

test("preferencia doméstica (oficina): gana un doméstico aunque haya un industrial con menos unidades", () => {
  const base = { largo: 4, ancho: 3, alto: 2.6, renovaciones: 6, eficiencia: 0.8, linea: "todas" };
  const sin = calcular(base, catalogo);
  const con = calcular({ ...base, preferirLinea: "domestica" }, catalogo);
  assert.equal(con.opciones[0].linea, "domestica");
  assert.equal(con.opciones[0].preferida, true);
  assert.ok(sin.opciones.length === con.opciones.length);
});

test("preferencia doméstica se ignora si necesitaría más de 6 unidades", () => {
  const r = calcular({ largo: 60, ancho: 30, alto: 5, renovaciones: 10, eficiencia: 0.8, linea: "todas", preferirLinea: "domestica" }, catalogo);
  assert.equal(r.opciones[0].linea, "industrial");
});

test("alcance 'ambas': solo modelos con extracción e inyección, siempre en pareja (2x unidades)", () => {
  const r = calcular({ largo: 30, ancho: 20, alto: 8, renovaciones: 10, eficiencia: 0.8, funcion: "ambas", entradaAire: true }, catalogo);
  assert.ok(r.opciones.length > 0);
  assert.ok(r.opciones.every((o) => o.extraccion && o.inyeccion && o.enPareja && o.unidades === 2 * o.unidadesPorLado));
});

test("alcance 'inyeccion': hay modelos (ya no queda vacío)", () => {
  const r = calcular({ largo: 20, ancho: 10, alto: 5, renovaciones: 10, eficiencia: 0.8, linea: "todas", funcion: "inyeccion" }, catalogo);
  assert.ok(r.opciones.length > 0);
  assert.ok(r.opciones.every((o) => o.inyeccion === true));
});

test("personas suman aire: caudal requerido = renovaciones + personas×m³/h + área×m³/h/m²", () => {
  const base = { largo: 10, ancho: 10, alto: 3, renovaciones: 6, eficiencia: 0.8 };
  const sin = calcular(base, catalogo);
  const con = calcular({ ...base, personas: 20, m3hPorPersona: 8.5, m3hPorM2: 1.1 }, catalogo);
  assert.equal(sin.caudalPersonas, 0);
  assert.ok(Math.abs(con.caudalPersonas - (20 * 8.5 + 100 * 1.1)) < 1e-9);
  assert.ok(Math.abs(con.caudalRequerido - (sin.caudalRequerido + con.caudalPersonas)) < 1e-9);
});

test("caudal brindado por lado en catálogo (CFM) = unidades por lado × CFM del modelo", () => {
  const r = calcular({ largo: 20, ancho: 10, alto: 5, renovaciones: 10, eficiencia: 0.8, linea: "industrial" }, catalogo);
  const o = r.opciones.find((x) => x.modelo === "DF600");
  assert.ok(Math.abs(o.caudalCatalogoCfm - o.unidadesPorLado * 7600) < 1e-6);
});

test("AIP-500/AIP-600 son axiales: sin entrada de aire van en pareja", () => {
  const r = calcular({ largo: 10, ancho: 10, alto: 4, renovaciones: 8, eficiencia: 0.8, linea: "industrial", entradaAire: false }, catalogo);
  const aip = r.opciones.filter((o) => nombreDe(o).startsWith("AIP"));
  assert.equal(aip.length, 2);
  assert.ok(aip.every((o) => o.axial && o.enPareja && o.unidades === 2 * o.unidadesPorLado));
});

test("escala de ruido: dB → nivel 1–15 (cada nivel = 5 dB)", () => {
  assert.equal(nivelDeDb(30), 1);
  assert.equal(nivelDeDb(35), 1);
  assert.equal(nivelDeDb(36), 2);
  assert.equal(nivelDeDb(60), 6);
  assert.equal(nivelDeDb(70), 8);
  assert.equal(nivelDeDb(130), 15);
});

test("nivelRuido del catálogo manda sobre los dB: un axial queda fuera con personas trabajando (≤ nivel 10), el 50T-W no", () => {
  const axial = catalogo.find((f) => f.modelo === "AXIAL 9,5");
  const t50 = catalogo.find((f) => f.modelo === "50T-W");
  assert.ok(nivelRuidoDe(axial) > nivelRuidoDe(t50) + 2);
  const r = calcular({ largo: 20, ancho: 10, alto: 5, renovaciones: 10, eficiencia: 0.8, linea: "industrial", nivelRuidoMax: 10 }, catalogo);
  assert.ok(!r.opciones.some((o) => o.modelo === "AXIAL 9,5"));
  assert.ok(r.opciones.some((o) => o.modelo === "50T-W"));
});

// ── Personas según tipo de local y explicación para ventas ──────────────────
const localesData = JSON.parse(readFileSync(new URL("../data/locales.json", import.meta.url)));

test("cada tipo de local trae una opción de personas válida por defecto", () => {
  const validas = ["libre", "moderado", "bajo", "personalizado"];
  for (const l of localesData) assert.ok(validas.includes(l.personas), `${l.nombre}: ${l.personas}`);
  assert.equal(localesData.find((l) => l.nombre === "Almacén / bodega").personas, "moderado");
  assert.equal(localesData.find((l) => l.nombre === "Oficina").personas, "bajo");
});

test("bodega con personas trabajando (nivel 10): fuera los AXIAL grandes; todas las opciones hasta nivel 10", () => {
  const r = calcular({ largo: 30, ancho: 20, alto: 7, renovaciones: 10, linea: "todas", nivelRuidoMax: 10 }, catalogo);
  assert.ok(r.opciones.every((o) => !o.modelo.startsWith("AXIAL")));
  assert.ok(r.opciones.every((o) => o.nivelRuido <= 10));
  assert.equal(r.opciones[0].modelo, "DF750");
});

test("explicarEleccion describe caudal, cantidad, motivo, ruido, consumo y alternativa", () => {
  const r = calcular({ largo: 20, ancho: 12, alto: 6, renovaciones: 10, linea: "todas", nivelRuidoMax: 10 }, catalogo);
  const lineas = explicarEleccion({ resultado: r, opcion: r.opciones[0], renovaciones: 10, nivelRuidoMax: 10, nombreNivel: () => "Alto" });
  assert.equal(lineas.length, 6);
  assert.match(lineas[0].replace(/\D(?=\d{3}\b)/g, ""), /1440 m³/);
  assert.match(lineas[1], /^1 Pared 30" \(DF750\) mueve/);
  assert.match(lineas[2], /menos equipos/);
  assert.match(lineas[3], /^Nivel de ruido alto, adecuado para las personas/);
  assert.match(lineas[5], /^Alternativa:/);
});

test("explicarEleccion avisa 220 V y opción elegida manualmente", () => {
  const r = calcular({ largo: 30, ancho: 20, alto: 7, renovaciones: 10, linea: "todas" }, catalogo);
  const axial = r.opciones.find((o) => o.modelo === "AXIAL 9,5");
  const otra = r.opciones.find((o) => o.modelo !== r.opciones[0].modelo && !o.axial);
  assert.match(explicarEleccion({ resultado: r, opcion: axial, renovaciones: 10 }).join(" "), /220 V/);
  const manual = explicarEleccion({ resultado: r, opcion: otra, renovaciones: 10 });
  assert.match(manual.join(" "), /elegida manualmente/);
  assert.ok(!manual.some((l) => l.startsWith("Alternativa")));
});

test("UR-623 (techo) cuenta para el caudal, pero en espacios de más de 30 m² nunca es la primera opción", () => {
  const grande = calcular({ largo: 10, ancho: 8, alto: 3, renovaciones: 6, linea: "domestica" }, catalogo);
  const ur = grande.opciones.find((o) => o.modelo === "UR-623");
  assert.ok(ur && ur.relegado);
  assert.notEqual(grande.opciones[0].modelo, "UR-623");
  assert.ok(grande.opciones.slice(-2).every((o) => o.techo)); // UR-623 y VO-16 (de techo) al final
  const lineas = explicarEleccion({ resultado: grande, opcion: ur, renovaciones: 6 });
  assert.match(lineas.join(" "), /ventilador de techo: en espacios de más de 30 m²/);
});

test("UR-623 en una cabina pequeña (≤ 30 m²) compite normal", () => {
  const r = calcular({ largo: 5, ancho: 5, alto: 3, renovaciones: 50, linea: "domestica" }, catalogo);
  const ur = r.opciones.find((o) => o.modelo === "UR-623");
  assert.equal(ur.relegado, false);
  assert.equal(r.opciones[0].modelo, "UR-623");
});

test("domésticos sin entrada de aire: se les pide 25 % más de caudal; a los industriales no", () => {
  const con = calcular({ largo: 10, ancho: 8, alto: 3, renovaciones: 6, linea: "todas", entradaAire: true }, catalogo);
  const sin = calcular({ largo: 10, ancho: 8, alto: 3, renovaciones: 6, linea: "todas", entradaAire: false }, catalogo);
  const dom = sin.opciones.find((o) => o.modelo === "VP-16CR");
  assert.equal(dom.factorSinEntrada, 1.25);
  assert.ok(Math.abs(dom.requeridoCfm - sin.caudalRequeridoCfm * 1.25) < 1e-6);
  assert.ok(dom.unidades >= con.opciones.find((o) => o.modelo === "VP-16CR").unidades);
  assert.equal(sin.opciones.find((o) => o.modelo === "XDF-45").factorSinEntrada, 1);
  const lineas = explicarEleccion({ resultado: sin, opcion: dom, renovaciones: 6 });
  assert.match(lineas.join(" "), /no tiene entrada de aire.*25 % más/);
});

// ── Tolerancia de exceso (30 %) ─────────────────────────────────────────────
test("tolerancia: taller de soldadura 18x10x4 cambia 1 AXIAL 9,5 (+41 %) por 2 × 50T-S", () => {
  const r = calcular({ largo: 18, ancho: 10, alto: 4, renovaciones: 25, linea: "todas" }, catalogo);
  assert.equal(mejor(r), "50T-S x2");
  assert.equal(r.ajuste.reemplaza.modelo, "AXIAL 9,5");
  const lineas = explicarEleccion({ resultado: r, opcion: r.opciones[0], renovaciones: 25 });
  assert.match(lineas.join(" "), /Se prefirió sobre Axial GLF 9\.5 \(AXIAL 9,5\) × 1/);
});

test("tolerancia: bodega 15x10x5 con personas trabajando → 2 × XDF-45 en vez de 1 × 50T-S (+73 %)", () => {
  const r = calcular({ largo: 15, ancho: 10, alto: 5, renovaciones: 7, linea: "todas", nivelRuidoMax: 10, preferirLinea: null }, catalogo);
  assert.equal(mejor(r), "XDF-45 x2");
  assert.equal(r.ajuste.reemplaza.modelo, "50T-S");
});

test("tolerancia: no acepta opciones que consumen más de 50 % de vatios (fábrica 15x10x5 se queda con DF750)", () => {
  const r = calcular({ largo: 15, ancho: 10, alto: 5, renovaciones: 15, linea: "todas" }, catalogo);
  assert.equal(mejor(r), "DF750 x1");
  assert.equal(r.ajuste, null);
  assert.equal(r.sinAjuste, true);
  const lineas = explicarEleccion({ resultado: r, opcion: r.opciones[0], renovaciones: 15 });
  assert.match(lineas.join(" "), /no tiene una opción más ajustada/);
});

test("tolerancia: en locales sin preferencia doméstica no salta de industrial a doméstica", () => {
  const r = calcular({ largo: 10, ancho: 8, alto: 4, renovaciones: 15, linea: "todas", nivelRuidoMax: 10 }, catalogo);
  assert.notEqual(r.opciones[0].linea, "domestica");
});

test("tolerancia: el exceso se mide contra el caudal pedido con la barra (125 %)", () => {
  const r = calcular({ largo: 20, ancho: 12, alto: 6, renovaciones: 10, linea: "todas", margen: 1.25 }, catalogo);
  const o = r.opciones[0];
  assert.ok(Math.abs(o.excesoPedido - (o.caudalTotal / (r.caudalRequerido * 1.25) - 1)) < 1e-9);
  if (r.ajuste) assert.ok(o.excesoPedido <= 0.3);
});

test("sin opciones: fábrica con personas (nivel 10) y 220 V sugiere quitar el ruido o el voltaje", () => {
  const entrada = { largo: 30, ancho: 10, alto: 10, renovaciones: 30, linea: "todas", nivelRuidoMax: 10, voltaje: "220V" };
  assert.equal(calcular(entrada, catalogo).opciones.length, 0);
  const s = diagnosticarSinOpciones(entrada, catalogo);
  assert.equal(s.length, 2);
  assert.match(s[0].motivo, /nivel de ruido es muy bajo/);
  assert.equal(s[0].opcion.modelo, "AXIAL 12,5");
  assert.equal(s[1].accion, "la conexión eléctrica");
  assert.equal(s[1].opcion.modelo, "DF750");
});

test("explicación: VP-16C recomendado en oficina dice fácil de instalar, ruido en palabras y la diferencia con el VP-16CR", () => {
  const r = calcular({ largo: 6, ancho: 5, alto: 6, renovaciones: 12, linea: "todas", nivelRuidoMax: 7, preferirLinea: "domestica" }, catalogo);
  const vp = r.opciones.find((o) => o.modelo === "VP-16C");
  const lineas = explicarEleccion({ resultado: { ...r, opciones: [vp, r.opciones.find((o) => o.modelo === "VP-16CR")] }, opcion: vp, renovaciones: 12, nivelRuidoMax: 7 });
  const texto = lineas.join(" ");
  assert.match(texto, /Es un ventilador de pared de cordón, fácil de instalar\./);
  assert.match(texto, /Nivel de ruido medio, adecuado/);
  assert.doesNotMatch(texto, /de 15/);
  assert.match(texto, /el VP-16CR tiene control remoto y el VP-16C es de cordón/);
});

test("domésticos: descripción de tipo y control, y diferencia cuando el tipo cambia", () => {
  const por = Object.fromEntries(catalogo.map((f) => [f.modelo, f]));
  assert.equal(descripcionModelo(por["VP-16CR"]), "de pared con control remoto");
  assert.equal(descripcionModelo(por["FS-40"]), "de pie con perilla");
  assert.equal(descripcionModelo(por["LF-18"]), "3 en 1 (pie, pared o mesa) con perilla");
  assert.equal(por["VO-16"].techo, true);
  const r = calcular({ largo: 6, ancho: 5, alto: 3, renovaciones: 12, linea: "domestica", nivelRuidoMax: 7, preferirLinea: "domestica" }, catalogo);
  const a = r.opciones.find((o) => o.modelo === "FS-45");
  const b = r.opciones.find((o) => o.modelo === "VP-16C");
  const lineas = explicarEleccion({ resultado: { ...r, opciones: [a, b] }, opcion: a, renovaciones: 12, nivelRuidoMax: 7 });
  assert.match(lineas.at(-1), /el VP-16C es de pared de cordón y el FS-45 es de pie con botones/);
});
