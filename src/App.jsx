import { useEffect, useMemo, useRef, useState } from "react";
import ventiladores from "./data/ventiladores.json";
import locales from "./data/locales.json";
import nivelesRuido from "./data/ruido.json";
import contaminantes from "./data/contaminantes.json";
import escalaRuido from "./data/escalaRuido.json";
import { calcular, aNumero, renovacionesDe, diagnosticarSinOpciones, RENDIMIENTO_VENTILADOR } from "./lib/calculo.js";
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
  local: "", // "" = sin seleccionar (las listas principales empiezan en «Seleccionar…»)
  calor: "medio", // calor de la zona: "bajo" | "medio" | "alto" = mínimo, media o máximo del rango de renovaciones (por defecto la media)
  contaminante: "", // ver data/contaminantes.json: multiplica las renovaciones por hora
  personas: "", // cantidad aproximada de personas (opcional)
  entradaAire: "", // "si" | "no"
  renovacionesManual: "",
  voltaje: "Cualquiera",
  linea: "todas", // "industrial" | "domestica" | "todas"
  montaje: "cualquiera", // tipo de ventilador: "cualquiera" | "pared" | "piso" | "techo"
  cobertura: 100, // % del caudal requerido a cubrir (65 a 125); 100 = caudal calculado con 80 % de rendimiento
  // Personas en el local (define el límite de ruido). Se sugiere según el tipo de local (campo "personas" de locales.json).
  ruido: "",
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
  const nivelRuidoMax = useMemo(() => {
    if (form.ruido === "personalizado") {
      const v = aNumero(form.ruidoPersonalizado);
      return Number.isFinite(v) && v >= 1 ? Math.min(15, Math.round(v)) : Infinity;
    }
    return nivelesRuido.find((r) => r.id === form.ruido)?.maxNivel ?? Infinity;
  }, [form.ruido, form.ruidoPersonalizado]);

  const preferirLinea = local?.preferencia ?? null;

  const entrada = useMemo(
    () => ({
          largo: aNumero(form.largo),
          ancho: aNumero(form.ancho),
          alto: aNumero(form.alto),
          altoMin: aNumero(form.altoMin),
          renovaciones,
          voltaje: form.voltaje,
          linea: form.linea,
          montaje: form.montaje,
          preferirLinea,
        usarCobertura: "domesticos", // cobertura en m² de la ficha: solo domésticos (los industriales aún no tienen todos el dato)
          eficiencia: RENDIMIENTO_VENTILADOR,
          margen: form.cobertura / 100,
          personas,
          m3hPorPersona: local?.rpp ?? 0,
          m3hPorM2: local?.rm2 ?? 0,
          nivelRuidoMax,
          funcion: form.funcion,
          entradaAire: form.entradaAire === "si",
        }),
    [form, renovaciones, nivelRuidoMax, preferirLinea, personas, local]
  );
  // Datos obligatorios que faltan: sin ellos no se calcula.
  const faltan = [];
  if (![entrada.largo, entrada.ancho, entrada.alto].every((n) => Number.isFinite(n) && n > 0)) faltan.push("Largo, ancho y altura");
  if (!form.local) faltan.push("Tipo de local");
  if (!form.contaminante) faltan.push("Contaminantes");
  if (!form.entradaAire) faltan.push("Entrada de aire");
  if (!form.ruido) faltan.push("Personas en el local");
  const completo = faltan.length === 0;

  const resultado = useMemo(() => (completo ? calcular(entrada, ventiladores) : null), [entrada, completo]);
  // Si ningún modelo cumple todos los filtros juntos, qué cambio daría una recomendación.
  const sugerencias = useMemo(
    () => (resultado && resultado.opciones.length === 0 ? diagnosticarSinOpciones(entrada, ventiladores) : []),
    [resultado, entrada]
  );

  // La página baja sola al resultado cuando se completa la última parte del formulario: todos los datos
  // obligatorios y, si hay personas, la cantidad de personas. Espera 1,2 s sin cambios para no interrumpir
  // mientras se escribe, y lo hace una sola vez: vuelve a activarse si algún dato queda incompleto (por ejemplo, con Limpiar).
  const resultadoRef = useRef(null);
  const yaBajo = useRef(false);
  const hayPersonas = form.ruido !== "" && form.ruido !== "libre";
  const listo = resultado != null && (!hayPersonas || (Number.isFinite(personas) && personas > 0));
  useEffect(() => {
    if (!resultado) yaBajo.current = false;
    if (!listo) return undefined;
    if (yaBajo.current) return undefined;
    const espera = setTimeout(() => {
      yaBajo.current = true;
      const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      resultadoRef.current?.scrollIntoView({ behavior: reducir ? "auto" : "smooth", block: "start" });
    }, 1200);
    return () => clearTimeout(espera);
  }, [listo, resultado, form.largo, form.ancho, form.alto, form.personas]);

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
              escalaRuido={escalaRuido}
              factorContaminante={factorContaminante}
              renovaciones={renovaciones}
              onLimpiar={() => setForm(INICIAL)}
            />
            <div ref={resultadoRef} className="ancla-resultado">
            <Resultados
              resultado={resultado}
              renovaciones={renovaciones}
              nivelRuidoMax={nivelRuidoMax}
              escalaRuido={escalaRuido}
              funcion={form.funcion}
              entradaAire={form.entradaAire === "si"}
              voltajeElegido={form.voltaje}
              sugerencias={sugerencias}
              faltan={faltan}
            />
            </div>
          </div>
          <p className="formula">
            Volumen (m³) = largo × ancho × alto · Caudal requerido Q (m³/h) = volumen × renovaciones por hora (R/H) · CFM = m³/h × 0.5886 ·
            Unidades = (caudal requerido × caudal a cubrir) ÷ (CFM de catálogo × 80 % de rendimiento), redondeado hacia arriba. Con personas se suma el
            aire de ventilación por ocupante (ASHRAE 62.1) y con contaminantes se multiplican las renovaciones. Las renovaciones por tipo
            de local son valores de referencia (DIN 1946); el calor de la zona elige el mínimo, la media (por defecto) o el máximo del rango. Se recomienda la opción con menos unidades; si da más de 30 % de aire de más, se
            elige una más ajustada (máximo 1 unidad más por lado y hasta 50 % más de consumo). En domésticos, la cantidad también cubre el área del piso
            según la ficha, y con personas se recomienda al menos 1 ventilador por cada 10.
          </p>
        </section>

        <Pasos />
      </main>

      <Footer />
    </>
  );
}
