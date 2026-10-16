export default function Footer() {
  return (
    <footer className="footer">
      <div className="contenedor footer-fila">
        <div>
          <a className="logo" href="#inicio" aria-label="VEGGA, inicio">
            VEG<span>GA</span>
          </a>
          <p className="footer-nota">
            El cálculo es una guía de selección. Con ductos, rejillas o filtros el caudal real es menor que el de catálogo.
          </p>
        </div>
        <nav className="footer-enlaces" aria-label="Enlaces rápidos">
          <a href="#calculadora">Calculadora</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#inicio">Volver arriba</a>
        </nav>
      </div>
      <div className="contenedor">
        <div className="footer-legal">© {new Date().getFullYear()} VEGGA. Todos los derechos reservados.</div>
      </div>
    </footer>
  );
}
