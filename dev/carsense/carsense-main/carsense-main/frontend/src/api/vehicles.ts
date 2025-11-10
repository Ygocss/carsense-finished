// frontend/src/api/vehicles.ts
import http from "./http";
import type {
  Vehicle,
  VehicleCreate,
  VehicleUpdate,
  NextServicesOut,
  NextServiceItem,
  ServiceRecord,
} from "../types";

// --------- Shapes del BACKEND (solo en esta capa) ----------
type BVehicle = {
  id: number;
  marca: string;
  modelo: string;
  anio: number;
  odometro: number;
  vin?: string | null;
};

type BVehicleCreate = Omit<BVehicle, "id">;
type BVehicleUpdate = Partial<Omit<BVehicle, "id">>;

type BNextItem = {
  servicio?: string;
  proximo_km?: number | null;
  proxima_fecha?: string | null;
  razon?: string;        // "por_km", "por_fecha", etc.
  // algunos backends ya devuelven estos nombres:
  service?: string;
  remaining_km?: number | null;
  remaining_days?: number | null;
  due?: boolean;
};

type BNextServicesOut = {
  vehicle_id: number;
  items: BNextItem[];
};

// --------- Mappers ----------
function fromBackendVehicle(b: BVehicle): Vehicle {
  return {
    id: b.id,
    marca: b.marca,
    modelo: b.modelo,
    anio: b.anio,
    current_km: b.odometro, // map odometro -> current_km
    vin: b.vin ?? null,
  };
}

function toBackendCreate(v: VehicleCreate): BVehicleCreate {
  // El backend no usa oil_change_km / rotation_km -> los ignoramos
  return {
    marca: v.marca,
    modelo: v.modelo,
    anio: v.anio,
    odometro: v.current_km, // map current_km -> odometro
    vin: v.vin ?? null,
  };
}

function toBackendUpdate(p: VehicleUpdate): BVehicleUpdate {
  const out: BVehicleUpdate = {};
  if (p.marca !== undefined) out.marca = p.marca;
  if (p.modelo !== undefined) out.modelo = p.modelo;
  if (p.anio !== undefined) out.anio = p.anio;
  if (p.current_km !== undefined) out.odometro = p.current_km;
  if (p.vin !== undefined) out.vin = p.vin ?? null;
  return out;
}

// Si el backend trae nombres distintos, los pasamos a los que usa tu UI.
function mapNext(b: BNextServicesOut): NextServicesOut {
  const items: NextServiceItem[] = (b.items || []).map((it) => {
    // nombre del servicio
    const service =
      it.service ??
      it.servicio ??
      "";

    // km restantes
    let remaining_km: number | null =
      it.remaining_km ?? null;
    if (remaining_km == null && it.proximo_km != null) {
      // si solo hay "proximo_km", lo usamos como remaining_km
      remaining_km = it.proximo_km;
    }

    // días restantes
    let remaining_days: number | null =
      it.remaining_days ?? null;

    // flag de vencido
    const due =
      it.due ??
      (typeof remaining_km === "number" && remaining_km <= 0);

    return { service, remaining_km, remaining_days, due };
  });

  return { vehicle_id: b.vehicle_id, items };
}

// --------- API calls ----------
export async function listVehicles(): Promise<Vehicle[]> {
  const data = await http<BVehicle[]>("/api/v1/vehicles");
  return data.map(fromBackendVehicle);
}

export async function createVehicle(payload: VehicleCreate): Promise<Vehicle> {
  const body = toBackendCreate(payload);
  const created = await http<BVehicle>("/api/v1/vehicles", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return fromBackendVehicle(created);
}

export async function updateVehicle(
  id: number,
  patch: VehicleUpdate
): Promise<Vehicle> {
  const body = toBackendUpdate(patch);
  const updated = await http<BVehicle>(`/api/v1/vehicles/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return fromBackendVehicle(updated);
}

export async function nextServices(vehicleId: number): Promise<NextServicesOut> {
  // Primero intentamos /next-services (según tu Swagger),
  // si no existe, probamos /next.
  try {
    const raw = await http<BNextServicesOut>(`/api/v1/vehicles/${vehicleId}/next-services`);
    return mapNext(raw);
  } catch (e: any) {
    if (e?.status === 404) {
      const raw2 = await http<BNextServicesOut>(`/api/v1/vehicles/${vehicleId}/next`);
      return mapNext(raw2);
    }
    throw e;
  }
}

// En tu proyecto, los records ya están en otro archivo y usan:
//  GET /api/v1/service-records/by-vehicle/{id}
//  POST /api/v1/service-records/
export type { ServiceRecord }; // export re-use
