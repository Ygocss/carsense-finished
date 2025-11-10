// Tipos para el cliente Axios y tus endpoints
import type { AxiosInstance } from "axios";

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  odometer_km?: number;
  next_service_km?: number;
}

export interface Service {
  id: number;
  vehicle_id: number;
  service_type: string;
  date: string; // ISO yyyy-mm-dd
  km: number;
  notes?: string | null;
}

export const api: AxiosInstance;

// Salud
export function getHealth(): Promise<any>;

// Vehículos
export function getVehicles(): Promise<Vehicle[]>;
export function getVehicle(id: number | string): Promise<Vehicle | null>;
export function addVehicle(
  payload: Omit<Vehicle, "id">
): Promise<Vehicle>;
export function updateVehicle(
  id: number | string,
  payload: Partial<Omit<Vehicle, "id">>
): Promise<Vehicle>;

// Servicios
export function listServices(
  vehicle_id?: number | null
): Promise<Service[]>;
export function createService(
  payload: Omit<Service, "id">
): Promise<Service>;
export function updateService(
  id: number | string,
  payload: Partial<Omit<Service, "id">>
): Promise<Service>;
export function deleteService(
  id: number | string
): Promise<any>;
export function exportHistory(): Promise<Service[]>;

// Aliases
export const createVehicle: typeof addVehicle;
export const fetchVehicles: typeof getVehicles;
export const getServices: typeof listServices;
export const removeService: typeof deleteService;
export const saveVehicle: typeof updateVehicle;
