// frontend/src/api/client.ts
import axios, { AxiosError } from "axios";

/* =============== Tipos =============== */
export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year?: number | null;
  odometer_km?: number | null;
}
export interface VehicleCreate {
  make: string;
  model: string;
  year?: number | null;
  odometer_km?: number | null;
}

export interface Service {
  id: number;
  vehicle_id: number;
  service_type?: string | null;
  date?: string | null;   // YYYY-MM-DD
  km?: number | null;
  notes?: string | null;
}
export interface ServiceCreate {
  vehicle_id: number;
  service_type?: string;
  date?: string;          // YYYY-MM-DD
  km?: number;
  notes?: string;
}

export type ReminderKind = "date" | "odometer";
export interface Reminder {
  id: number;
  vehicle_id: number;
  kind: ReminderKind;
  due_date?: string | null;
  due_km?: number | null;
  done?: boolean | null;
  notes?: string | null;
}
export interface ReminderCreate {
  vehicle_id: number;
  kind: ReminderKind;
  due_date?: string;
  due_km?: number;
  notes?: string;
}

/* =============== Axios base =============== */
// Normaliza baseURL (sin /api/v1 al final)
const raw = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
const cleaned = (raw && raw.replace(/\/+$/, "")) || "http://127.0.0.1:8000";
const baseURL = cleaned.replace(/\/api\/v1$/i, "");

// Prefijo fijo del API
const API_PREFIX = "/api/v1";
const apiUrl = (p: string) => `${API_PREFIX}${p}`;

export const api = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: false,
  headers: { Accept: "application/json" },
});

// Bearer token si existe
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

/* Helpers */
const isAxiosError = (e: unknown): e is AxiosError => axios.isAxiosError(e);
const statusFrom = (e: unknown): number | undefined =>
  isAxiosError(e) ? e.response?.status : undefined;

const unwrap = <T>(data: unknown): T => {
  if (Array.isArray(data)) return data as T;
  // @ts-expect-error estructura común { data: [...] }
  return (data?.data ?? []) as T;
};

/* =============== Salud =============== */
export const getHealth = async (): Promise<unknown> => {
  const { data } = await api.get("/health");
  return data;
};

/* =============== Vehículos =============== */
export const getVehicles = async (): Promise<Vehicle[]> => {
  const { data } = await api.get(apiUrl("/vehicles"));
  return unwrap<Vehicle[]>(data);
};

export const getVehicle = async (id: number | string): Promise<Vehicle | null> => {
  try {
    const { data } = await api.get(apiUrl(`/vehicles/${id}`));
    return data as Vehicle;
  } catch {
    const list = await getVehicles();
    return list.find((v) => String(v.id) === String(id)) ?? null;
  }
};

export const addVehicle = async (payload: VehicleCreate): Promise<Vehicle> => {
  const { data } = await api.post(apiUrl("/vehicles"), payload);
  return data as Vehicle;
};

export const updateVehicle = async (
  id: number | string,
  payload: VehicleCreate
): Promise<Vehicle> => {
  const path = apiUrl(`/vehicles/${id}`);
  try {
    const { data } = await api.put(path, payload);
    return data as Vehicle;
  } catch (e: unknown) {
    const st = statusFrom(e);
    if (st === 405 || st === 404) {
      try {
        const { data } = await api.patch(path, payload);
        return data as Vehicle;
      } catch {
        const { data } = await api.post(path, payload);
        return data as Vehicle;
      }
    }
    throw e;
  }
};

export const deleteVehicle = async (
  id: number | string
): Promise<{ ok: true } | unknown> => {
  const path = apiUrl(`/vehicles/${id}`);
  console.log("DELETE vehicle ->", api.defaults.baseURL + path);
  try {
    const res = await api.delete(path);
    return (res.data as unknown) ?? { ok: true };
  } catch (e: unknown) {
    const st = statusFrom(e);
    if (st === 404) throw new Error("DELETE /vehicles/{id} no existe o el vehículo no se encontró.");
    if (st === 405) throw new Error("El backend no permite DELETE en /vehicles/{id}.");
    throw e;
  }
};

/* =============== Servicios =============== */
export const listServices = async (vehicleId?: number): Promise<Service[]> => {
  const base = apiUrl("/services");
  const url = vehicleId ? `${base}?vehicle_id=${vehicleId}` : base;
  const { data } = await api.get(url);
  const arr = unwrap<Service[]>(data);
  return vehicleId ? arr.filter((s) => s.vehicle_id === Number(vehicleId)) : arr;
};

export const createService = async (payload: ServiceCreate): Promise<Service> => {
  const { data } = await api.post(apiUrl("/services"), payload);
  return data as Service;
};

// (alias por compatibilidad con código anterior)
export const addService = createService;

export const deleteService = async (id: number | string): Promise<{ ok: true }> => {
  const path = apiUrl(`/services/${id}`);
  console.log("DELETE service ->", api.defaults.baseURL + path);
  await api.delete(path);
  return { ok: true };
};

/* =============== Recordatorios =============== */
export const listReminders = async (vehicleId?: number): Promise<Reminder[]> => {
  const base = apiUrl("/reminders");
  const url = vehicleId ? `${base}?vehicle_id=${vehicleId}` : base;
  const { data } = await api.get(url);
  return unwrap<Reminder[]>(data);
};

export const addReminder = async (payload: ReminderCreate): Promise<Reminder> => {
  const { data } = await api.post(apiUrl("/reminders"), payload);
  return data as Reminder;
};

export const deleteReminder = async (id: number | string): Promise<{ ok: true }> => {
  await api.delete(apiUrl(`/reminders/${id}`));
  return { ok: true };
};

export const toggleReminder = async (id: number | string): Promise<Reminder> => {
  const { data } = await api.patch(apiUrl(`/reminders/${id}`));
  return data as Reminder;
};

/* =============== Aliases (compat) =============== */
export const getServices = listServices;
export const createVehicle = addVehicle;
export const fetchVehicles = getVehicles;
export const removeService = deleteService;
export const removeVehicle = deleteVehicle;
