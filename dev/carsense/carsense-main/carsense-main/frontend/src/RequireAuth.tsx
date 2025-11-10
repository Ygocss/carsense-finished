// frontend/src/RequireAuth.tsx
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

type Props = { children: ReactNode };

export default function RequireAuth({ children }: Props) {
  const token = localStorage.getItem("token");
  const loc = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return <>{children}</>;
}
