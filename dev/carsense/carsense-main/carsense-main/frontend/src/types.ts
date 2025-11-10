// frontend/src/types.ts

// -------- Vehículos (lo que usa la UI) --------
export type Vehicle = {
  id: number;
  marca: string;
  modelo: string;
  anio: number;
  current_km: number;        // la UI trabaja con current_km
  oil_change_km?: number;    // usados en tu formulario (opcional en tipos)
  rotation_km?: number;      // idem
  vin?: string | null;
};

export type VehicleCreate = Omit<Vehicle, "id">;
export type VehicleUpdate = Partial<Omit<Vehicle, "id">>;

// -------- Registros de servicio --------
export type ServiceRecord = {
  id: number;
  vehicle_id: number;
  servicio: string;    // "aceite", "rotacion", etc.
  fecha: string;       // YYYY-MM-DD
  km: number;
  notas?: string | null;
};

export type ServiceRecordCreate = Omit<ServiceRecord, "id">;

// -------- Próximos servicios (lo que pinta tu UI) --------
export type NextServiceItem = {
  service: string;               // nombre del servicio
  remaining_km: number | null;   // km restantes
  remaining_days: number | null; // días restantes
  due: boolean;                  // vencido o no
};

export type NextServicesOut = {
  vehicle_id: number;
  items: NextServiceItem[];
};
