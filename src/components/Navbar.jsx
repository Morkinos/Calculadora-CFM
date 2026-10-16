export default function Navbar() {
  return (
    <header className="navbar">
      <div className="contenedor navbar-fila">
        <a className="logo" href="#inicio" aria-label="VEGGA, inicio">
          VEG<span>GA</span>
        </a>
        <nav className="navbar-enlaces" aria-label="Principal">
          <a href="#calculadora">Calculadora</a>
          <a href="#como-funciona">Cómo funciona</a>
        </nav>
        <a className="boton boton-primario boton-chico" href="#calculadora">
          Calcular
        </a>
      </div>
    </header>
  );
}
