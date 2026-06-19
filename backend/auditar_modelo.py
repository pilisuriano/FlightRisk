import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

# 1. Cargar el dataset (necesitamos los datos para evaluar el modelo)
df = pd.read_csv('backend/flights_dataset_final.csv', sep=';')
X = df[['avg_delay_minutes', 'weather_risk', 'avg_sentiment', 
        'cancellation_strict_rate', 'delay_rate']]
y = df['stress_level']

# Dividimos exactamente igual que cuando lo entrenamos
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 2. Cargar ("Despertar") tu modelo guardado
print("Cargando modelo desde .pkl...\n")
modelo = joblib.load('backend/flight_risk_model.pkl')

# 3. Análisis de Overfitting / Underfitting
# Comparamos cómo le va con los datos que "ya estudió" vs datos "nuevos"
y_pred_train = modelo.predict(X_train)
y_pred_test = modelo.predict(X_test)

acc_train = accuracy_score(y_train, y_pred_train)
acc_test = accuracy_score(y_test, y_pred_test)

print("--- DIAGNÓSTICO DE AJUSTE (OVERFITTING/UNDERFITTING) ---")
print(f"Precisión en Entrenamiento (Datos memorizados): {acc_train * 100:.2f}%")
print(f"Precisión en Prueba (Datos nuevos): {acc_test * 100:.2f}%")

if acc_train > 0.98 and acc_test < 0.80:
    print("ALERTA: Tu modelo tiene OVERFITTING (Memorizó, pero no generaliza bien).")
elif acc_train < 0.70 and acc_test < 0.70:
    print("ALERTA: Tu modelo tiene UNDERFITTING (No logró aprender las reglas).")
else:
    print("ESTADO: Tu modelo tiene un buen equilibrio de aprendizaje.\n")

# 4. Importancia de Variables (¿A qué le presta más atención el modelo?)
print("--- IMPORTANCIA DE LAS VARIABLES (FEATURE IMPORTANCE) ---")
importancias = modelo.feature_importances_
columnas = X.columns

for col, imp in zip(columnas, importancias):
    print(f"-> {col}: {imp * 100:.2f}%")

# 5. Matriz de Confusión (¿Dónde se equivoca?)
print("\n--- MATRIZ DE CONFUSIÓN ---")
print("Las filas son la realidad, las columnas son las predicciones.")
print(confusion_matrix(y_test, y_pred_test))

# 6. Reporte Detallado de Accuracy
print("\n--- REPORTE FINAL DE CLASIFICACIÓN ---")
print(classification_report(y_test, y_pred_test))