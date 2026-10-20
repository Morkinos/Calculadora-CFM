import { useState } from "react";

export default function Navbar() {
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);
  return (
    <header className="navbar">
      <div className="contenedor navbar-fila">
        <a className="logo" href="#inicio" aria-label="VEGGA, inicio">
          VEGGA
        </a>
        <nav id="menu-principal" className={`navbar-enlaces${abierto ? " abierto" : ""}`} aria-label="Principal">
          <a href="#calculadora" onClick={cerrar}>Calculadora</a>
          <a href="#como-funciona" onClick={cerrar}>Cómo funciona</a>
          <a className="boton boton-primario boton-chico" href="#calculadora" onClick={cerrar}>
            Calcular
          </a>
        </nav>
        <button
          type="button"
          className="menu-boton"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={abierto}
          aria-controls="menu-principal"
          onClick={() => setAbierto((a) => !a)}
        >
          <span /><span /><span />
        </button>
      </div>
    </header>
  );
}
