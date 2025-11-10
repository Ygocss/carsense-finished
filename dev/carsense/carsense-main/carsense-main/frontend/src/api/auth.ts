// frontend/src/api/auth.ts
import http, { setToken, clearToken } from "./http";

type LoginResp = { access_token: string; token_type?: string };

export async function login(email: string, password: string): Promise<void> {
  // Enviamos JSON { email, password }
  const data = await http.post<LoginResp>("/api/v1/auth/login", { email, password });
  if (!data?.access_token) throw new Error("El servidor no devolvió token");
  setToken(data.access_token);
}

export async function register(email: string, password: string): Promise<void> {
  // Registro vía JSON también
  await http.post<void>("/api/v1/auth/register", { email, password });
}

export function logout(): void {
  clearToken();
}
