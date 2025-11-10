// frontend/src/api/alerts.ts
import http from "./http";

export type Alert = {
  id: number;
  title: string;
  vehicle_id?: number | null;
  acknowledged?: boolean;
};

export async function listAlerts() {
  return http<Alert[]>("/api/v1/alerts/");
}

export async function runAlertsNow() {
  // En tu API es POST /alerts/run-now
  return http<void>("/api/v1/alerts/run-now", { method: "POST" });
}
