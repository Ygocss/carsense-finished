// frontend/src/api/http.ts
// Wrapper ligero sobre fetch con baseURL, Bearer token y JSON seguro.

type HttpOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  // Puedes ampliar con signal/credentials si lo necesitas
};

let TOKEN: string | null = null;

// --- Token helpers ---
export function setToken(t: string) {
  TOKEN = t;
  try { localStorage.setItem("token", t); } catch {}
}
export function getToken(): string | null {
  if (TOKEN) return TOKEN;
  try { TOKEN = localStorage.getItem("token"); } catch {}
  return TOKEN;
}
export function clearToken() {
  TOKEN = null;
  try { localStorage.removeItem("token"); } catch {}
}

// Cargar token al iniciar módulo
getToken();

// --- Base URL ---
// Lee VITE_API_URL (patrón usado en el proyecto) y VITE_API_BASE como respaldo.
// Además soporta window.__API_BASE__ para overrides locales.
const RAW =
  (import.meta as any)?.env?.VITE_API_URL?.trim?.() ||
  (import.meta as any)?.env?.VITE_API_BASE?.trim?.() ||
  (window as any).__API_BASE__?.trim?.() ||
  "http://127.0.0.1:8000";

// Normaliza: quita “/” final y remueve “/api/v1” si viniera
const cleaned = RAW.replace(/\/+$/, "");
const BASE_URL = cleaned.replace(/\/api\/v1$/i, "");

// Une base + path, permitiendo URLs absolutas
function joinUrl(base: string, path: string) {
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

// ¿Body es JSON serializable? (no forzar JSON si es FormData/Blob/etc.)
function shouldSetJson(body: any) {
  if (!body) return false;
  if (typeof body === "string") return true; // ya viene string (probablemente JSON)
  if (body instanceof FormData) return false;
  if (body instanceof Blob) return false;
  if (body instanceof ArrayBuffer) return false;
  return true; // objetos/arrays: sí
}

// --- core fetch ---
async function coreFetch<T>(path: string, opts: HttpOptions = {}): Promise<T> {
  const url = joinUrl(BASE_URL, path);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers || {}),
  };

  // Añade Bearer si tenemos token (y no lo pasaron manualmente)
  const tok = getToken();
  if (tok && !headers.Authorization) headers.Authorization = `Bearer ${tok}`;

  let body = opts.body;

  // Si el body es objeto/array/string y no es FormData/Blob, pon JSON por defecto
  if (shouldSetJson(body)) {
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    if (typeof body !== "string" && headers["Content-Type"].includes("application/json")) {
      body = JSON.stringify(body);
    }
  }

  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body,
    mode: "cors",
  });

  // Auto-logout en 401
  if (res.status === 401) {
    clearToken();
  }

  // 204 No Content
  if (res.status === 204) {
    // @ts-expect-error: el caller sabe que puede ser void
    return undefined;
  }

  // Intenta parsear JSON; si no, lanza con preview
  const ctype = res.headers.get("content-type") || "";
  const isJson = ctype.includes("application/json");
  let data: any = null;

  if (isJson) {
    try {
      data = await res.json();
    } catch {
      // cuerpo vacío o JSON inválido
      data = null;
    }
  } else {
    // lee texto para ayudar a depurar
    const raw = await res.text();
    if (raw) {
      console.error("Respuesta NO JSON desde:", url, "\nPreview:", raw.slice(0, 300));
    }
  }

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message)) ||
      `${res.status} ${res.statusText}` ||
      "Error HTTP";
    const err: any = new Error(String(msg));
    err.status = res.status;
    err.detail = data;
    throw err;
  }

  return (data ?? ({} as T)) as T;
}

// --- tipo del http con helpers colgados ---
type HttpFn = (<T>(path: string, opts?: HttpOptions) => Promise<T>) & {
  get: <T>(path: string) => Promise<T>;
  post: <T>(path: string, body?: any) => Promise<T>;
  put: <T>(path: string, body?: any) => Promise<T>;
  patch: <T>(path: string, body?: any) => Promise<T>;
  delete: <T>(path: string) => Promise<T>;
};

// --- función principal http (default) ---
const http = (async <T>(path: string, opts: HttpOptions = {}) =>
  coreFetch<T>(path, opts)) as HttpFn;

// --- helpers ---
http.get = async function <T>(path: string) {
  return coreFetch<T>(path, { method: "GET" });
};
http.post = async function <T>(path: string, body?: any) {
  return coreFetch<T>(path, { method: "POST", body });
};
http.put = async function <T>(path: string, body?: any) {
  return coreFetch<T>(path, { method: "PUT", body });
};
http.patch = async function <T>(path: string, body?: any) {
  return coreFetch<T>(path, { method: "PATCH", body });
};
http.delete = async function <T>(path: string) {
  return coreFetch<T>(path, { method: "DELETE" });
};

export default http;
