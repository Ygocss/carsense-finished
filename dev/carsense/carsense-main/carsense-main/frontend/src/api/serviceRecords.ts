import http from "./http";
import type { ServiceRecord, ServiceRecordCreate } from "../types";

export async function listRecordsByVehicle(vehicleId: number): Promise<ServiceRecord[]> {
  return http.get<ServiceRecord[]>(`/api/v1/service-records/by-vehicle/${vehicleId}`);
}

export async function createRecord(payload: ServiceRecordCreate): Promise<ServiceRecord> {
  return http.post<ServiceRecord>("/api/v1/service-records/", payload);
}
