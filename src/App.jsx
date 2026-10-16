import { useMemo, useState } from "react";
import ventiladores from "./data/ventiladores.json";
import locales from "./data/locales.json";
import nivelesRuido from "./data/ruido.json";
import { calcular, aNumero } from "./lib/calculo.js";
import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import Formulario from "./components/Formulario.jsx";
import Resultados from "./components/Resultados.jsx";
import Pasos from "./components/Pasos.jsx";
import Footer from "./components/Footer.jsx";

const INICIAL = {
  largo: "",
  ancho: "",
  alto: "",
  local: locales[0].nombre,
  renovacionesManual: "",
  voltaje: "Cualquiera",
  eficiencia: 80,
  ruido: "libre",
  ruidoPersonalizado: "",
  funcion: "cualquiera",
};

export default function App() {
  const [form, setForm] = useState(INICIAL);

  const renovaciones = useMemo(() => {
    const manual = aNumero(form.renovacionesManual);
    if (Number.isFinite(manual) && manual > 0) return manual;
    return locales.find((l) => l.nombre === form.local)?.renovaciones ?? NaN;
  }, [form.local, form.renovacionesManual]);

  // Límite de ruido por unidad en dB (Infinity = sin límite).
  const ruidoMaxDb = useMemo(() => {
    if (form.ruido === "personalizado") {
      const v = aNumero(form.ruidoPersonalizado);
      return Number.isFinite(v) && v > 0 ? v : Infinity;
    }
    return nivelesRuido.find((r) => r.id === form.ruido)?.maxDb ?? Infinity;
  }, [form.ruido, form.ruidoPersonalizado]);

  const resultado = useMemo(
    () =>
      calcular(
        {
          largo: aNumero(form.largo),
          ancho: aNumero(form.ancho),
          alto: aNumero(form.alto),
          renovaciones,
          voltaje: form.voltaje,
          eficiencia: form.eficiencia / 100,
          ruidoMaxDb,
          funcion: form.funcion,
        },
        ventiladores
      ),
    [form, renovaciones, ruidoMaxDb]
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
            <Resultados resultado={resultado} renovaciones={renovaciones} ruidoMaxDb={ruidoMaxDb} />
          </div>
          <p className="formula">
            Volumen = largo × ancho × alto · Caudal requerido = volumen × renovaciones/h · Unidades = caudal requerido ÷ (caudal de
            catálogo × factor de eficiencia), redondeado hacia arriba. Las renovaciones por tipo de local son valores típicos de
            referencia.
          </p>
        </section>

        <Pasos />
      </main>

      <Footer />
    </>
  );
}
