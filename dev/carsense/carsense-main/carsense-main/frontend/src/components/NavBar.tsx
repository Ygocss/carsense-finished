// frontend/src/components/NavBar.tsx
import { Link, NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <nav className="topbar">
      <Link to="/" className="brand">CarSense</Link>
      <ul className="menu">
        <li><NavLink to="/mantenimiento">Mantenimiento</NavLink></li>
        <li><NavLink to="/historial">Historial</NavLink></li>
        <li><NavLink to="/education">Educación</NavLink></li>
        <li><NavLink to="/chatbot">Chatbot</NavLink></li>
      </ul>
    </nav>
  );
}
