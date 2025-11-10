import { NavLink, useNavigate } from "react-router-dom";

export default function TopBar() {
  const nav = useNavigate();
  const token = localStorage.getItem("cs_token");

  const logout = () => {
    localStorage.removeItem("cs_token");
    nav("/login");
  };

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <a className="logo" href="/"><span>🚗</span>CarSense</a>

        <nav className="nav">
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/educacion">Educación</NavLink>
          <NavLink to="/productos">Productos</NavLink>
          <NavLink to="/academia">Academia</NavLink>
          <NavLink to="/curiosidades">Curiosidades</NavLink>
          <NavLink to="/datos">Datos</NavLink>
          <NavLink to="/contacto">Contacto</NavLink>
          <NavLink to="/app">Mantenimiento</NavLink>
        </nav>

        <div style={{marginLeft:"auto"}}>
          {token ? (
            <button className="btn btn--ghost" onClick={logout}>Salir</button>
          ) : (
            <NavLink to="/login" className="btn btn--solid">Iniciar sesión</NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
