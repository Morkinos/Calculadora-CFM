import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calcular, aNumero, nombreDe } from "./calculo.js";

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

test("nave 100x50x10, 8 ren/h → AXIAL 12,5 x14", () => {
  const r = calcular({ largo: 100, ancho: 50, alto: 10, renovaciones: 8, eficiencia: 0.8 }, catalogo);
  assert.equal(mejor(r), "AXIAL 12,5 x14");
});

test("filtro 220V, 4800 m³ a 10 ren/h → AXIAL 9,5 x2 y solo hay 2 opciones", () => {
  const r = calcular({ largo: 30, ancho: 20, alto: 8, renovaciones: 10, voltaje: "220V", eficiencia: 0.8 }, catalogo);
  assert.equal(mejor(r), "AXIAL 9,5 x2");
  assert.equal(r.opciones.length, 2);
});

test("cocina 4800 m³, 20 ren/h, 110V, 100% → DF750 x5", () => {
  const r = calcular({ largo: 30, ancho: 20, alto: 8, renovaciones: 20, voltaje: "110V", eficiencia: 1 }, catalogo);
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
    { largo: 20, ancho: 10, alto: 5, renovaciones: 10, eficiencia: 0.8, funcion: "extraccion", voltaje: "110V", ruidoMaxDb: 80 },
    catalogo
  );
  assert.deepEqual(r.opciones.map((o) => nombreDe(o)).sort(), ["AIP-500", "AIP-600"]);
});

test("nombre mostrado: solo el modelo", () => {
  assert.equal(nombreDe({ modelo: "50T-W" }), "50T-W");
  assert.equal(nombreDe({ modelo: "FAD60-4 (AIP60)", nombreMostrado: "AIP-600" }), "AIP-600");
});

test("datos incompletos → null", () => {
  assert.equal(calcular({ largo: 10, ancho: NaN, alto: 3, renovaciones: 6 }, catalogo), null);
  assert.equal(calcular({ largo: 10, ancho: 5, alto: 3, renovaciones: 0 }, catalogo), null);
});

test("aNumero acepta coma decimal", () => {
  assert.equal(aNumero("4,5"), 4.5);
  assert.ok(Number.isNaN(aNumero("")));
});
