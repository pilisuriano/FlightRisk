import pandas as pd
import json
import os
from weather_api import obtener_riesgo_climatico_pronostico
from aviation_api import obtener_vuelos_reales
from airport_geo import get_airport_coords


ARCHIVO_CACHE = "backend/vuelos_cache.json"


# ======================
# CACHE
# ======================
def cargar_cache():
    if os.path.exists(ARCHIVO_CACHE):
        with open(ARCHIVO_CACHE, "r") as f:
            return json.load(f)
    return []


def guardar_cache(data):
    os.makedirs(os.path.dirname(ARCHIVO_CACHE), exist_ok=True)
    with open(ARCHIVO_CACHE, "w") as f:
        json.dump(data, f, indent=2)


# ======================
# PIPELINE PRINCIPAL
# ======================
def generar_dataset_final():
    print("🚀 Iniciando dataset FlightRisk...")

    # 1. CACHE EXISTENTE
    cache_actual = cargar_cache()

    # 2. NUEVOS VUELOS
    print("🌐 Consultando API de vuelos...")
    nuevos_vuelos = obtener_vuelos_reales(limite=50)

    if not nuevos_vuelos:
        print("❌ No hay vuelos nuevos")
        return

    # 3. KEY PARA EVITAR DUPLICADOS
    def key(v):
        return (
            v.get("airline"),
            v.get("origin_airport"),
            v.get("destination_airport"),
            v.get("fecha_completa_iso")
        )

    existentes_keys = {key(v) for v in cache_actual}

    vuelos_unicos = []

    for v in nuevos_vuelos:
        if key(v) not in existentes_keys:
            vuelos_unicos.append(v)

    cache_actual.extend(vuelos_unicos)

    # 4. GUARDAR CACHE ACUMULADO (IMPORTANTE)
    guardar_cache(cache_actual)

    print(f"📦 Cache total: {len(cache_actual)} vuelos")

    # 5. DATASET FINAL
    dataset_final = []
    descartados = 0

    for r in cache_actual:
        airline = r.get("airline")
        fecha = r.get("fecha_completa_iso")
        origin = r.get("origin_airport")

        if not airline or not fecha or not origin:
            descartados += 1
            continue

        # 🌍 AIRPORT → COORDS (CLAVE DEL FIX)
        coords = get_airport_coords(origin)

        if not coords:
            descartados += 1
            continue

        lat, lon = coords

        # 🌦 WEATHER REAL (NO MÁS BA)
        weather_risk = obtener_riesgo_climatico_pronostico(
            lat,
            lon,
            fecha[:16]
        )

        dataset_final.append({
            "airline": airline,
            "origin_airport": origin,
            "destination_airport": r.get("destination_airport"),
            "departure_hour": r.get("departure_hour"),
            "avg_delay_minutes": r.get("avg_delay_minutes"),
            "weather_risk": weather_risk
        })

    df = pd.DataFrame(dataset_final)
    df.to_csv("backend/flights_dataset.csv", index=False)

    print("\n✅ Dataset generado correctamente")
    print(f"📊 filas: {len(df)}")
    print(f"🚫 descartados: {descartados}")


if __name__ == "__main__":
    generar_dataset_final()