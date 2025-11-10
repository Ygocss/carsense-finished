// frontend/src/App.tsx
import React, { lazy, Suspense } from "react";
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import RequireAuth from "./components/RequireAuth"; // tu guard
import Login from "./pages/Login";                  // tu página de login
import { logout } from "./api/auth";

const Home = lazy(() => import("./pages/Home"));
const Mantenimiento = lazy(() => import("./pages/Mantenimiento"));
const Historial = lazy(() => import("./pages/Historial"));
const Education = lazy(() => import("./pages/Education"));
const Chatbot = lazy(() => import("./pages/Chatbot"));
const Products = lazy(() => import("./pages/Products"));
const Academia = lazy(() => import("./pages/Academia"));
const Datos = lazy(() => import("./pages/Datos"));

type PageProps = { name: string; children: React.ReactElement };
function Page({ name, children }: PageProps) {
  return (
    <ErrorBoundary name={name}>
      <Suspense fallback={<div style={{ padding: 16 }}>Cargando {name}…</div>}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function HeaderNav() {
  const nav = useNavigate();
  return (
    <nav style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
      <Link to="/">Inicio</Link>
      <Link to="/education">Educación</Link>
      <Link to="/productos">Productos</Link>
      <Link to="/academia">Academia</Link>
      <Link to="/datos">Datos</Link>
      <Link to="/mantenimiento">Mantenimiento</Link>
      <Link to="/historial">Historial</Link>
      <Link to="/chatbot">Chatbot</Link>
      <span style={{ marginLeft: "auto" }} />
      <button
        onClick={() => {
          logout();
          nav("/login", { replace: true });
        }}
      >
        Salir
      </button>
    </nav>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const hideNav = pathname.startsWith("/login");

  return (
    <div style={{ padding: hideNav ? 0 : 16 }}>
      {!hideNav && <HeaderNav />}

      <Routes>
        {/* login sin nav */}
        <Route path="/login" element={<Login onOk={() => (window.location.href = "/")} />} />

        {/* rutas protegidas */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <Page name="Home"><Home /></Page>
            </RequireAuth>
          }
        />
        <Route
          path="/education"
          element={
            <RequireAuth>
              <Page name="Educación"><Education /></Page>
            </RequireAuth>
          }
        />
        <Route
          path="/productos"
          element={
            <RequireAuth>
              <Page name="Productos"><Products /></Page>
            </RequireAuth>
          }
        />
        <Route
          path="/academia"
          element={
            <RequireAuth>
              <Page name="Academia"><Academia /></Page>
            </RequireAuth>
          }
        />
        <Route
          path="/datos"
          element={
            <RequireAuth>
              <Page name="Datos"><Datos /></Page>
            </RequireAuth>
          }
        />
        <Route
          path="/mantenimiento"
          element={
            <RequireAuth>
              <Page name="Mantenimiento"><Mantenimiento /></Page>
            </RequireAuth>
          }
        />
        <Route
          path="/historial"
          element={
            <RequireAuth>
              <Page name="Historial"><Historial /></Page>
            </RequireAuth>
          }
        />
        <Route
          path="/chatbot"
          element={
            <RequireAuth>
              <Page name="Chatbot"><Chatbot /></Page>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
