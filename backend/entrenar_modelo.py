import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

# 1. Cargar los datos sintéticos
print("Cargando datos...")
df = pd.read_csv('backend/flights_dataset.csv')

# 2. Separar las variables predictoras (X) de la variable a predecir (y)
X = df[['delay', 'weather', 'congestion', 'sentiment']]
y = df['stress']

# 3. Entrenar el Random Forest
print("Entrenando modelo Random Forest...")
modelo = RandomForestClassifier(n_estimators=100, random_state=42)
modelo.fit(X, y)

# 4. Guardar el modelo en un archivo para que FastAPI lo use
joblib.dump(modelo, 'backend/modelo_stress.pkl')
print("¡Modelo entrenado y guardado exitosamente como modelo_stress.pkl!")
