import { IconoMedidas, IconoUso, IconoResultado } from "./Iconos.jsx";

const pasos = [
  {
    Icono: IconoMedidas,
    titulo: "Ingrese las medidas",
    texto: "Largo, ancho y alto del local. Calculamos el volumen de aire que hay que renovar.",
  },
  {
    Icono: IconoUso,
    titulo: "Defina el uso",
    texto: "Tipo de local, si hay personas, la función del ventilador y el voltaje disponible.",
  },
  {
    Icono: IconoResultado,
    titulo: "Reciba la recomendación",
    texto: "El modelo más apto con su cantidad, y otras opciones para comparar.",
  },
];

export default function Pasos() {
  return (
    <section className="contenedor pasos" id="como-funciona" aria-labelledby="t-pasos">
      <h2 id="t-pasos">Cómo funciona</h2>
      <div className="pasos-rejilla">
        {pasos.map(({ Icono, titulo, texto }, i) => (
          <article className="paso" key={titulo}>
            <span className="paso-icono">
              <Icono />
            </span>
            <h3>
              <span className="paso-num">{i + 1}.</span> {titulo}
            </h3>
            <p>{texto}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
