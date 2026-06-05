from fastapi import FastAPI
import pandas as pd

app = FastAPI()

# 1. Definimos la fórmula PRIMERO (para que Python sepa que existe)
def calcular_stress(row):
    # Normalizamos el delay y calculamos un promedio de riesgo
    delay_norm = min(row['delay'] / 120, 1.0)
    score = (delay_norm + row['weather'] + row['congestion'] + (1 - row['sentiment'])) / 4
    
    if score < 0.33:
        return 'Low'
    elif score < 0.66:
        return 'Medium'
    else:
        return 'High'

# 2. Endpoints de la API
@app.get("/")
def home():
    return {"mensaje": "¡Bienvenido a la API de FlightRisk!"}

@app.get("/api/vuelos")
def obtener_vuelos():
    try:
        # Leemos el archivo
        df = pd.read_csv('backend/flights_dataset.csv')
        
        # LIMPIEZA 1: Eliminamos cualquier fila completamente vacía (enters extra)
        df = df.dropna(how='all')
        
        # Aplicamos la lógica (ahora sí va a encontrar la función)
        df['stress'] = df.apply(calcular_stress, axis=1)
        
        # LIMPIEZA 2: Convertimos cualquier NaN residual a None (que en JSON es 'null')
        df = df.where(pd.notna(df), None)
        
        # Enviamos los datos procesados
        return df.to_dict(orient="records")
        
    except FileNotFoundError:
        return {"error": "El archivo no se encuentra en la ruta especificada."}
    except Exception as e:
        return {"error": str(e)}