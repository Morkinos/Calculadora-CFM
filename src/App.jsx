import { useMemo, useState } from "react";
import ventiladores from "./data/ventiladores.json";
import locales from "./data/locales.json";
import nivelesRuido from "./data/ruido.json";
import { calcular, aNumero, renovacionesDe, eficienciaDe } from "./lib/calculo.js";
import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import Formulario from "./components/Formulario.jsx";
import Resultados from "./components/Resultados.jsx";
import Pasos from "./components/Pasos.jsx";
import Footer from "./components/Footer.jsx";

const INICIAL = {
  largo: "",
  ancho: "",
  alto: "", // altura máxima
  altoMin: "", // altura mínima (opcional)
  local: locales[0].nombre,
  calor: "medio", // "bajo" | "medio" | "alto": mínimo, media o máximo del rango de renovaciones
  entradaAire: "si", // "si" | "no"
  renovacionesManual: "",
  voltaje: "Cualquiera",
  linea: "todas", // "industrial" | "domestica" | "todas"
  cobertura: 100, // % del caudal requerido a cubrir (65 a 125); 100 = caudal calculado con 80 % de rendimiento
  ruido: "libre",
  ruidoPersonalizado: "",
  funcion: "cualquiera",
};

export default function App() {
  const [form, setForm] = useState(INICIAL);

  const renovaciones = useMemo(() => {
    const manual = aNumero(form.renovacionesManual);
    if (Number.isFinite(manual) && manual > 0) return manual;
    const local = locales.find((l) => l.nombre === form.local);
    return local ? renovacionesDe(local, form.calor) : NaN;
  }, [form.local, form.calor, form.renovacionesManual]);

  // Límite de ruido por unidad en dB (Infinity = sin límite).
  const ruidoMaxDb = useMemo(() => {
    if (form.ruido === "personalizado") {
      const v = aNumero(form.ruidoPersonalizado);
      return Number.isFinite(v) && v > 0 ? v : Infinity;
    }
    return nivelesRuido.find((r) => r.id === form.ruido)?.maxDb ?? Infinity;
  }, [form.ruido, form.ruidoPersonalizado]);

  const preferirLinea = useMemo(() => locales.find((l) => l.nombre === form.local)?.preferencia ?? null, [form.local]);

  const resultado = useMemo(
    () =>
      calcular(
        {
          largo: aNumero(form.largo),
          ancho: aNumero(form.ancho),
          alto: aNumero(form.alto),
          altoMin: aNumero(form.altoMin),
          renovaciones,
          voltaje: form.voltaje,
          linea: form.linea,
          preferirLinea,
          eficiencia: eficienciaDe(form.cobertura),
          ruidoMaxDb,
          funcion: form.funcion,
          entradaAire: form.entradaAire === "si",
        },
        ventiladores
      ),
    [form, renovaciones, ruidoMaxDb, preferirLinea]
  );

  return (
    <>
      <Navbar />
      <Hero totalModelos={ventiladores.length} />

      <main>
        <section className="contenedor calculadora" id="calculadora" aria-label="Calculadora">
          <div className="rejilla">
            <Formulario
              form={form}
              setForm={setForm}
              locales={locales}
              nivelesRuido={nivelesRuido}
              renovaciones={renovaciones}
              onLimpiar={() => setForm(INICIAL)}
            />
            <Resultados
              resultado={resultado}
              renovaciones={renovaciones}
              ruidoMaxDb={ruidoMaxDb}
              entradaAire={form.entradaAire === "si"}
            />
          </div>
          <p className="formula">
            Volumen (m³) = largo × ancho × alto · Caudal requerido Q (m³/h) = volumen × renovaciones por hora (R/H) · CFM = m³/h × 0.5886 ·
            Unidades = (caudal requerido × caudal a cubrir) ÷ (CFM de catálogo × 80 % de rendimiento), redondeado hacia arriba. Las renovaciones por
            tipo de local son aproximadas (tabla de VEGGA y DIN 1946 para almacenes).
          </p>
        </section>

        <Pasos />
      </main>

      <Footer />
    </>
  );
}
