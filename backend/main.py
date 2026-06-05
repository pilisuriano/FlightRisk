from fastapi import FastAPI
import pandas as pd

app = FastAPI()

@app.get("/")
def home():
    return {"mensaje": "¡Bienvenido a la API de FlightRisk!"}

@app.get("/api/vuelos")
def obtener_vuelos():
    try:
        # Aquí leemos el CSV local (Paso inicial)
        # Más adelante, reemplazaremos esto con la conexión a MongoDB Atlas
        df = pd.read_csv('backend/flights_dataset.csv')
        
        # Convertimos los datos a un formato amigable para React
        return df.to_dict(orient="records")
    except FileNotFoundError:
        return {"error": "El archivo flights_dataset.csv no se encuentra en la raíz."}
    except Exception as e:
        return {"error": str(e)}
