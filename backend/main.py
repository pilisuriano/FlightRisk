from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib

app = FastAPI()

# 1. Cargar el modelo entrenado (se carga una sola vez al iniciar el servidor)
try:
    modelo = joblib.load("backend/modelo_stress.pkl")
    print("✅ Modelo cargado correctamente.")
except Exception as e:
    modelo = None
    print(f"⚠️ Error al cargar el modelo: {e}")

# 2. Definir la estructura de datos que enviará el Frontend (Variables Oficiales)
class VueloConsulta(BaseModel):
    avg_delay_minutes: float
    cancellation_rate: float
    connection_time: int
    airport_congestion: float
    weather_risk: float
    sentiment_score: float
    baggage_complaints: int
    departure_hour: int

# 3. NUEVO ENDPOINT: Predicción en vivo del Stress Level
@app.post("/api/evaluar_vuelo")
def evaluar_vuelo(vuelo: VueloConsulta):
    if modelo is None:
        return {"error": "El modelo predictivo no está disponible."}
    
    try:
        # Convertimos los datos que envía el usuario a un formato que Pandas y el modelo entiendan
        df_vuelo = pd.DataFrame([vuelo.dict()])
        
        # El modelo de Random Forest calcula el resultado
        prediccion = modelo.predict(df_vuelo)
        
        # Devolvemos la clasificación (Low, Medium o High)
        return {
            "mensaje": "Evaluación completada",
            "stress_level": prediccion[0]
        }
    except Exception as e:
        return {"error": f"Error al procesar el vuelo: {str(e)}"}

# 4. ENDPOINT EXISTENTE: Recomendación de alternativas seguras
@app.get("/api/recomendaciones")
def obtener_recomendaciones(origen: str, destino: str):
    try:
        df = pd.read_csv("backend/flights_dataset.csv")
        alternativas = df[
            (df['origin_airport'] == origen) & 
            (df['destination_airport'] == destino) & 
            (df['Stress_Level'] == 'Low')
        ]
        return alternativas.to_dict(orient="records")
    except Exception as e:
        return {"error": f"Hubo un problema al buscar recomendaciones: {str(e)}"}