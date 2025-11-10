// frontend/src/auth.tsx
import http, { setToken, clearToken } from "./api/http";

export async function login(email: string, password: string) {
  const data = await http<{ access_token: string }>("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
}

export async function register(email: string, password: string) {
  await http("/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  clearToken();
}
