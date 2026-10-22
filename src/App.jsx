import { useMemo, useState } from "react";
import ventiladores from "./data/ventiladores.json";
import locales from "./data/locales.json";
import nivelesRuido from "./data/ruido.json";
import contaminantes from "./data/contaminantes.json";
import { calcular, aNumero, renovacionesDe, RENDIMIENTO_VENTILADOR } from "./lib/calculo.js";
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
  calor: "alto", // "bajo" | "medio" | "alto": mínimo, media o máximo del rango de renovaciones (por defecto el máximo)
  contaminante: "ninguno", // ver data/contaminantes.json: multiplica las renovaciones por hora
  personas: "", // cantidad aproximada de personas (opcional)
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

  const local = useMemo(() => locales.find((l) => l.nombre === form.local), [form.local]);

  const factorContaminante = contaminantes.find((c) => c.id === form.contaminante)?.factor ?? 1;

  // Renovaciones por hora: base (manual o por tipo de local y nivel de calor) × factor por contaminantes.
  const renovaciones = useMemo(() => {
    const manual = aNumero(form.renovacionesManual);
    const base = Number.isFinite(manual) && manual > 0 ? manual : local ? renovacionesDe(local, form.calor) : NaN;
    return base * factorContaminante;
  }, [local, form.calor, form.renovacionesManual, factorContaminante]);

  // Personas: solo cuentan si el usuario indicó que hay personas en el local.
  const personas = form.ruido !== "libre" ? aNumero(form.personas) : NaN;

  // Límite de ruido por unidad en dB (Infinity = sin límite).
  const ruidoMaxDb = useMemo(() => {
    if (form.ruido === "personalizado") {
      const v = aNumero(form.ruidoPersonalizado);
      return Number.isFinite(v) && v > 0 ? v : Infinity;
    }
    return nivelesRuido.find((r) => r.id === form.ruido)?.maxDb ?? Infinity;
  }, [form.ruido, form.ruidoPersonalizado]);

  const preferirLinea = local?.preferencia ?? null;

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
          eficiencia: RENDIMIENTO_VENTILADOR,
          margen: form.cobertura / 100,
          personas,
          m3hPorPersona: local?.rpp ?? 0,
          m3hPorM2: local?.rm2 ?? 0,
          ruidoMaxDb,
          funcion: form.funcion,
          entradaAire: form.entradaAire === "si",
        },
        ventiladores
      ),
    [form, renovaciones, ruidoMaxDb, preferirLinea, personas, local]
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
              contaminantes={contaminantes}
              factorContaminante={factorContaminante}
              renovaciones={renovaciones}
              onLimpiar={() => setForm(INICIAL)}
            />
            <Resultados
              resultado={resultado}
              renovaciones={renovaciones}
              ruidoMaxDb={ruidoMaxDb}
              funcion={form.funcion}
              entradaAire={form.entradaAire === "si"}
            />
          </div>
          <p className="formula">
            Volumen (m³) = largo × ancho × alto · Caudal requerido Q (m³/h) = volumen × renovaciones por hora (R/H) · CFM = m³/h × 0.5886 ·
            Unidades = (caudal requerido × caudal a cubrir) ÷ (CFM de catálogo × 80 % de rendimiento), redondeado hacia arriba. Con personas se suma el
            aire de ventilación por ocupante (ASHRAE 62.1) y con contaminantes se multiplican las renovaciones. Las renovaciones por tipo
            de local son valores de referencia (DIN 1946); por defecto se usa el máximo del rango.
          </p>
        </section>

        <Pasos />
      </main>

      <Footer />
    </>
  );
}
