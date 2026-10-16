export default function Hero({ totalModelos }) {
  return (
    <section className="hero" id="inicio">
      <div className="contenedor hero-fila">
        <div className="hero-texto">
          <span className="hero-etiqueta">Ventilación industrial</span>
          <h1>
            Calcule el ventilador <em>ideal</em> para su espacio
          </h1>
          <p>
            Ingrese las medidas del local y las renovaciones de aire que necesita. Le indicamos el modelo y la cantidad
            recomendados, al instante.
          </p>
          <div className="hero-botones">
            <a className="boton boton-primario" href="#calculadora">
              Calcular ahora
            </a>
            <a className="boton boton-borde" href="#como-funciona">
              Cómo funciona
            </a>
          </div>
        </div>

        <aside className="vidrio" aria-label="Datos del catálogo">
          <div className="vidrio-item">
            <strong>{totalModelos}</strong>
            <span>modelos en catálogo</span>
          </div>
          <div className="vidrio-item">
            <strong>110 · 220 V</strong>
            <span>voltajes disponibles</span>
          </div>
          <div className="vidrio-item">
            <strong>Al instante</strong>
            <span>modelo y cantidad recomendados</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
