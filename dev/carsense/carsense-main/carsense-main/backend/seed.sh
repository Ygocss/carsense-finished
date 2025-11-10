#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

echo "[1/5] Borrando DB local (SQLite)"
rm -f carsense.db

echo "[2/5] Migraciones"
alembic upgrade head

echo "[3/5] Levanta backend TEMP para seed (puerto 8010)"
export PYTHONPATH=$PWD
uvicorn app.main:app --host 127.0.0.1 --port 8010 &
UVPID=$!
sleep 1.5

echo "[4/5] Crear usuario demo y vehículo + historial"
curl -s -X POST http://127.0.0.1:8010/api/v1/auth/register -H "Content-Type: application/json" -d '{"email":"demo@carsense.mx","password":"Demo1234!"}' >/dev/null || true
TOKEN=$(curl -s -X POST http://127.0.0.1:8010/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"demo@carsense.mx","password":"Demo1234!"}' | python - <<PY
import sys, json
print(json.load(sys.stdin).get("access_token",""))
PY
)

auth() { echo -H "Authorization: Bearer $TOKEN"; }

VID=$(curl -s -X POST http://127.0.0.1:8010/api/v1/vehicles/ $(auth) -H "Content-Type: application/json" \
  -d '{"marca":"Toyota","modelo":"Corolla","anio":2018,"odometro":65200}' | python - <<PY
import sys, json
print(json.load(sys.stdin).get("id",""))
PY
)

# Historial base (aceite + rotación)
curl -s -X POST http://127.0.0.1:8010/api/v1/service-records/ $(auth) -H "Content-Type: application/json" \
  -d '{"vehicle_id":'"$VID"',"servicio":"aceite","fecha":"2025-04-27","km":65200,"notas":"Seed: cambio aceite"}' >/dev/null

curl -s -X POST http://127.0.0.1:8010/api/v1/service-records/ $(auth) -H "Content-Type: application/json" \
  -d '{"vehicle_id":'"$VID"',"servicio":"rotacion_llantas","fecha":"2025-04-27","km":65200,"notas":"Seed: rotación"}' >/dev/null

# Genera alertas
curl -s -X POST http://127.0.0.1:8010/api/v1/alerts/run-now $(auth) >/dev/null

echo "[5/5] Listo. Vehículo ID = $VID"
kill $UVPID >/dev/null 2>&1 || true
