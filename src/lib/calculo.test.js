import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calcular, aNumero, nombreDe, renovacionesDe, eficienciaDe } from "./calculo.js";

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

test("límite de ruido 60 dB: solo modelos ≤ 60 dB; nave → AXIAL 9,5 x16", () => {
  const r = calcular({ largo: 100, ancho: 50, alto: 10, renovaciones: 8, eficiencia: 0.8, ruidoMaxDb: 60 }, catalogo);
  assert.ok(r.opciones.length > 0 && r.opciones.every((o) => o.ruidoMax <= 60));
  assert.equal(mejor(r), "AXIAL 9,5 x16");
});

test("límite de ruido 70 dB excluye DF750 (75 dB) y 50-FQ (71 dB)", () => {
  const r = calcular({ largo: 20, ancho: 10, alto: 5, renovaciones: 10, eficiencia: 0.8, ruidoMaxDb: 70 }, catalogo);
  const nombres = r.opciones.map((o) => o.modelo);
  assert.ok(!nombres.includes("DF750") && !nombres.includes("50-FQ") && nombres.includes("DF600"));
});

test("límite de ruido imposible → sin opciones", () => {
  const r = calcular({ largo: 10, ancho: 10, alto: 3, renovaciones: 6, ruidoMaxDb: 30 }, catalogo);
  assert.equal(r.opciones.length, 0);
});

test("función extracción: solo modelos con extraccion=true", () => {
  const r = calcular({ largo: 20, ancho: 10, alto: 5, renovaciones: 10, eficiencia: 0.8, funcion: "extraccion" }, catalogo);
  assert.ok(r.opciones.length > 0 && r.opciones.every((o) => o.extraccion === true));
  assert.ok(!r.opciones.some((o) => o.modelo === "DF600"));
});

test("extracción + 110V + moderado → solo los AIP", () => {
  const r = calcular(
    { largo: 20, ancho: 10, alto: 5, renovaciones: 10, eficiencia: 0.8, funcion: "extraccion", voltaje: "120V", ruidoMaxDb: 80 },
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

test("función inyección sin modelos marcados → sin opciones", () => {
  const base = { largo: 20, ancho: 10, alto: 5, renovaciones: 10 };
  assert.equal(calcular({ ...base, funcion: "inyeccion" }, catalogo).opciones.length, 0);
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

test("caudal a cubrir: 100% equivale al 80% de rendimiento; 125% pide más aire", () => {
  assert.ok(Math.abs(eficienciaDe(100) - 0.8) < 1e-12);
  const base = { largo: 20, ancho: 10, alto: 5, renovaciones: 10 };
  const a = calcular({ ...base, eficiencia: eficienciaDe(100) }, catalogo);
  const b = calcular({ ...base, eficiencia: eficienciaDe(125) }, catalogo);
  assert.ok(b.opciones[0].caudalTotal >= a.opciones[0].caudalTotal * 0 && b.opciones.find((o) => o.modelo === "DF600").unidades >= a.opciones.find((o) => o.modelo === "DF600").unidades);
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
