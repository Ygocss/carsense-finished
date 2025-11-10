// frontend/src/components/RequireAuth.tsx
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const token =
    typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  const loc = useLocation();

  if (!token) {
    // recuerda a dónde quería ir
    const from = (loc.pathname + loc.search) || "/";
    return <Navigate to="/login" replace state={{ from }} />;
  }
  return <>{children}</>;
}
