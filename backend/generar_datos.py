import pandas as pd
import json
import os
from weather_api import obtener_riesgo_climatico_pronostico

ARCHIVO_REVIEWS = "backend/reviews.json"   # tu dataset base
ARCHIVO_SALIDA = "backend/flights_dataset.csv"


def cargar_reviews():
    if not os.path.exists(ARCHIVO_REVIEWS):
        print("❌ No existe reviews.json")
        return []

    with open(ARCHIVO_REVIEWS, "r", encoding="utf-8") as f:
        return json.load(f)


def generar_dataset_final():
    print("🚀 Generando dataset limpio (Reviews + Weather)...")

    reviews = cargar_reviews()

    if not reviews:
        print("❌ No hay datos de reviews")
        return

    dataset_final = []

    for r in reviews:
        try:
            airline = r.get("airline")
            airport = r.get("airport")  # o origin / destino según tu modelo
            fecha = r.get("fecha_completa_iso")

            # 🔴 validación mínima
            if not airline or not fecha:
                continue

            # 🌦️ feature weather (única fuente externa)
            weather_risk = obtener_riesgo_climatico_pronostico(
                -34.0, -58.0,
                fecha[:16]
            )

            dataset_final.append({
                "airline": airline,
                "airport": airport,
                "departure_hour": r.get("departure_hour"),
                "avg_delay_minutes": r.get("avg_delay_minutes"),
                "weather_risk": weather_risk
            })

        except Exception as e:
            print("⚠️ Error en registro:", e)
            continue

    df = pd.DataFrame(dataset_final)

    df.to_csv(ARCHIVO_SALIDA, index=False)

    print("✅ Dataset final generado:")
    print(f"   - filas: {len(df)}")
    print(f"   - archivo: {ARCHIVO_SALIDA}")


if __name__ == "__main__":
    generar_dataset_final()