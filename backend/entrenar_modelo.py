import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

# 1. Cargar los datos sintéticos oficiales
print("Cargando datos...")
df = pd.read_csv('backend/flights_dataset.csv')

# 2. Separar las variables predictoras (X) de la variable a predecir (y)
# Usamos estrictamente las variables numéricas de tu propuesta
X = df[[
    'avg_delay_minutes', 
    'cancellation_rate', 
    'connection_time', 
    'airport_congestion', 
    'weather_risk', 
    'sentiment_score', 
    'baggage_complaints', 
    'departure_hour'
]]

# La columna target ahora usa el nombre actualizado
y = df['Stress_Level']

# 3. Entrenar el Random Forest
print("Entrenando modelo Random Forest...")
modelo = RandomForestClassifier(n_estimators=100, random_state=42)
modelo.fit(X, y)

# 4. Guardar el modelo en un archivo para que FastAPI lo use
joblib.dump(modelo, 'backend/modelo_stress.pkl')
print("¡Modelo entrenado y guardado exitosamente como modelo_stress.pkl!")