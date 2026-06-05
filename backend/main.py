from fastapi import FastAPI
import pandas as pd
import joblib

app = FastAPI()

# 1. Cargamos el modelo de Machine Learning una sola vez en la memoria del servidor
modelo_rf = joblib.load('backend/modelo_stress.pkl')

@app.get("/")
def home():
    return {"mensaje": "¡Bienvenido a la API inteligente de FlightRisk!"}

@app.get("/api/vuelos")
def obtener_vuelos():
    try:
        # Leemos el archivo con los 500 vuelos simulados
        df = pd.read_csv('backend/flights_dataset.csv')
        
        # LIMPIEZA 1: Eliminamos cualquier fila completamente vacía
        df = df.dropna(how='all')
        
        # 2. Preparamos las variables exactas que el modelo aprendió a leer
        X = df[['delay', 'weather', 'congestion', 'sentiment']]
        
        # 3. ¡LA MAGIA! El modelo predice el estrés basándose en lo que aprendió
        df['stress'] = modelo_rf.predict(X)
        
        # LIMPIEZA 2: Convertimos cualquier NaN residual a None (JSON 'null')
        df = df.where(pd.notna(df), None)
        
        # Enviamos los datos procesados
        return df.to_dict(orient="records")
        
    except FileNotFoundError:
        return {"error": "El archivo de datos o el modelo no se encuentran."}
    except Exception as e:
        return {"error": str(e)}
