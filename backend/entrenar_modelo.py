import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
import joblib # Para guardar el modelo entrenado

# 1. Cargar el dataset definitivo
print("Cargando dataset...")
df = pd.read_csv('backend/flights_dataset_final.csv', sep=';')

# 2. Preparar los Datos (Features y Target)
# Separamos lo que el modelo usa para adivinar (X) de lo que tiene que adivinar (y)
X = df[['avg_delay_minutes', 'weather_risk', 'avg_sentiment', 
        'cancellation_strict_rate', 'delay_rate']] # Variables clave del estrés
y = df['stress_level']

# 3. Dividir los datos en Entrenamiento y Prueba (80% / 20%)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Crear y Entrenar el Modelo (Random Forest)
print("Entrenando el modelo Random Forest (esto puede tomar unos segundos)...")
rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
rf_model.fit(X_train, y_train)

# 5. Evaluar qué tan inteligente se volvió el modelo
print("\nRealizando predicciones de prueba...")
y_pred = rf_model.predict(X_test)

print("\n--- Resultados del Modelo ---")
print(f"Precisión General (Accuracy): {accuracy_score(y_test, y_pred) * 100:.2f}%")
print("\nDetalle por Nivel de Estrés:")
print(classification_report(y_test, y_pred))

# 6. Guardar el "Cerebro" (Exportar el modelo)
# Esto crea un archivo .pkl que tu backend en Flask cargará después para la web
print("\nGuardando modelo en 'flight_risk_model.pkl'...")
joblib.dump(rf_model, 'backend/flight_risk_model.pkl')
print("¡Entrenamiento y guardado completados con éxito!")