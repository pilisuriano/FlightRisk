from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import joblib

import backend.airport_geo as airport_geo

app = FastAPI()

# ==============================================================================
#  main.py — API de FlightRisk (integración Front <-> Modelo)
#
#  El modelo reentrenado espera EXACTAMENTE estas 9 features, en este orden:
#    avg_delay_minutes, weather_risk, baggage_complaints, avg_sentiment,
#    cancellation_strict_rate, connection_rate, delay_rate, departure_hour,
#    tiene_reviews
#
#  De esas 9, solo 3 son "por vuelo" (las que conoce el frontend):
#    avg_delay_minutes, weather_risk, departure_hour
#  Las otras 6 son a NIVEL AEROLÍNEA (provienen de Skytrax) y en el dataset
#  son CONSTANTES por aerolínea. Por eso el servidor las "enriquece" a partir
#  del nombre de la aerolínea recibido (ver tabla `perfil_aerolineas`).
#
#  IMPORTANTE: este archivo SOLO lee el modelo y los CSV; nunca los modifica.
# ==============================================================================

RUTA_DATASET = "backend/flights_dataset_final.csv"
RUTA_MODELO = "backend/modelo_stress.pkl"

# Orden EXACTO de features que espera el modelo (no tocar).
FEATURES_MODELO = [
    'avg_delay_minutes', 'weather_risk', 'baggage_complaints', 'avg_sentiment',
    'cancellation_strict_rate', 'connection_rate', 'delay_rate',
    'departure_hour', 'tiene_reviews'
]

# Columnas a nivel aerolínea (constantes por aerolínea en el dataset).
COLS_AEROLINEA = [
    'baggage_complaints', 'avg_sentiment', 'cancellation_strict_rate',
    'connection_rate', 'delay_rate', 'tiene_reviews'
]

# --- Carga única al iniciar el servidor ---------------------------------------
try:
    modelo = joblib.load(RUTA_MODELO)
    print("✅ Modelo cargado correctamente.")
except Exception as e:
    modelo = None
    print(f"⚠️ Error al cargar el modelo: {e}")

try:
    # Dataset final (separador ';'). Se mantiene en memoria para recomendaciones
    # y para construir el perfil por aerolínea.
    df_vuelos = pd.read_csv(RUTA_DATASET, sep=';')

    # Perfil por aerolínea: como las columnas son constantes por aerolínea,
    # alcanza con tomar el primer valor de cada grupo.
    perfil_aerolineas = df_vuelos.groupby('airline')[COLS_AEROLINEA].first()

    # Promedio global para imputar aerolíneas desconocidas (misma lógica con la
    # que se construyó el dataset: si no hay reviews, tiene_reviews = 0).
    perfil_promedio = df_vuelos[COLS_AEROLINEA].mean().to_dict()
    perfil_promedio['tiene_reviews'] = 0

    print(f"✅ Dataset cargado: {len(df_vuelos)} vuelos, "
          f"{len(perfil_aerolineas)} aerolíneas.")
except Exception as e:
    df_vuelos = None
    perfil_aerolineas = None
    perfil_promedio = None
    print(f"⚠️ Error al cargar el dataset: {e}")

# Coordenadas de aeropuertos (IATA -> lat/lon/city/country) desde world_airports.csv
try:
    airport_geo.load_airports()
except Exception as e:
    print(f"⚠️ Error al cargar aeropuertos: {e}")


# 2. Estructura que envía el Frontend.
#    Solo las features "por vuelo" + la aerolínea (que dispara el enriquecimiento).
#    `connection_time` es informativo para el front; NO entra al modelo.
class VueloConsulta(BaseModel):
    airline: str
    avg_delay_minutes: float
    weather_risk: float
    departure_hour: int
    connection_time: Optional[int] = None


def _perfil_de_aerolinea(airline: str) -> dict:
    """Devuelve las 6 features a nivel aerolínea. Si la aerolínea no está en la
    tabla, imputa con el promedio global y tiene_reviews = 0."""
    if perfil_aerolineas is not None and airline in perfil_aerolineas.index:
        return perfil_aerolineas.loc[airline].to_dict()
    return dict(perfil_promedio)


# 3. ENDPOINT: predicción en vivo del nivel de estrés.
@app.post("/api/evaluar_vuelo")
def evaluar_vuelo(vuelo: VueloConsulta):
    if modelo is None:
        return {"error": "El modelo predictivo no está disponible."}

    try:
        datos = vuelo.model_dump()

        # Enriquecemos con el perfil de la aerolínea (las 6 features Skytrax).
        perfil = _perfil_de_aerolinea(datos["airline"])

        fila = {
            'avg_delay_minutes': datos["avg_delay_minutes"],
            'weather_risk': datos["weather_risk"],
            'baggage_complaints': perfil['baggage_complaints'],
            'avg_sentiment': perfil['avg_sentiment'],
            'cancellation_strict_rate': perfil['cancellation_strict_rate'],
            'connection_rate': perfil['connection_rate'],
            'delay_rate': perfil['delay_rate'],
            'departure_hour': datos["departure_hour"],
            'tiene_reviews': perfil['tiene_reviews'],
        }

        # DataFrame con las 9 columnas en el ORDEN EXACTO que espera el modelo.
        df_vuelo = pd.DataFrame([fila])[FEATURES_MODELO]
        prediccion = modelo.predict(df_vuelo)

        return {
            "mensaje": "Evaluación completada",
            "stress_level": str(prediccion[0])
        }
    except Exception as e:
        return {"error": f"Error al procesar el vuelo: {str(e)}"}


# 4. ENDPOINT: recomendación de alternativas para una ruta.
@app.get("/api/recomendaciones")
def obtener_recomendaciones(origen: str, destino: str):
    if df_vuelos is None:
        return {"error": "El dataset no está disponible."}
    try:
        candidatos = df_vuelos[
            (df_vuelos['origin_airport'] == origen) &
            (df_vuelos['destination_airport'] == destino)
        ].copy()

        # Menor stress_score = menos riesgo. Devolvemos las 10 mejores.
        candidatos = candidatos.sort_values("stress_score", ascending=True)
        return candidatos.head(10).to_dict(orient="records")
    except Exception as e:
        return {"error": str(e)}


# 5. ENDPOINT: aeropuertos realmente presentes en el dataset que tienen
#    coordenadas (para poblar los desplegables y el mapa del frontend).
@app.get("/api/aeropuertos")
def obtener_aeropuertos():
    if df_vuelos is None:
        return {"error": "El dataset no está disponible."}

    codigos = pd.unique(
        df_vuelos[['origin_airport', 'destination_airport']].values.ravel()
    )

    aeropuertos = []
    for iata in sorted(map(str, codigos)):
        info = airport_geo.get_airport_info(iata)
        if info:  # solo los que tienen coordenadas conocidas
            aeropuertos.append(info)
    return aeropuertos


# 6. ENDPOINT: aerolíneas presentes en el dataset (para el selector del front).
@app.get("/api/aerolineas")
def obtener_aerolineas():
    if df_vuelos is None:
        return {"error": "El dataset no está disponible."}
    return sorted(df_vuelos['airline'].dropna().unique().tolist())
