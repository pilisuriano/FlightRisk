import pandas as pd
import numpy as np
import joblib
import matplotlib
matplotlib.use("Agg")  # backend sin pantalla
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (accuracy_score, classification_report,
                             confusion_matrix, ConfusionMatrixDisplay)

# ==============================================================================
#  entrenar_modelo.py  —  Entrena y VALIDA el Random Forest.
#  Cambios clave:
#   - Lee el dataset final (sep=';').
#   - EXCLUYE stress_score y stress_level de las features (si no, hay leakage).
#   - Split ESTRATIFICADO + class_weight='balanced' (clases desbalanceadas).
#   - Control de overfitting (max_depth, min_samples_leaf).
#   - Reporta métricas completas y guarda modelo + reporte + gráficos.
# ==============================================================================

# Features que SÍ usa el modelo. OJO: stress_score / stress_level NO van acá.
FEATURES = [
    'avg_delay_minutes', 'weather_risk', 'baggage_complaints', 'avg_sentiment',
    'cancellation_strict_rate', 'connection_rate', 'delay_rate',
    'departure_hour', 'tiene_reviews'
]
TARGET = 'stress_level'

print("Cargando datos...")
df = pd.read_csv('backend/flights_dataset_final.csv', sep=';')

# Si por algún motivo falta 'tiene_reviews', lo derivamos para no romper
if 'tiene_reviews' not in df.columns:
    df['tiene_reviews'] = (df['avg_sentiment'] != 0).astype(int)

X = df[FEATURES]
y = df[TARGET]

print("Balance de clases:")
print(y.value_counts(), "\n")

# Split estratificado: mantiene la proporción de clases en train y test
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Random Forest con pesos balanceados + límites para no sobreajustar
modelo = RandomForestClassifier(
    n_estimators=300,
    max_depth=12,
    min_samples_leaf=5,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
print("Entrenando Random Forest...")
modelo.fit(X_train, y_train)

# --- Diagnóstico de overfitting ---
acc_train = accuracy_score(y_train, modelo.predict(X_train))
acc_test = accuracy_score(y_test, modelo.predict(X_test))
y_pred = modelo.predict(X_test)

# --- Cross-validation (5 folds) ---
cv = cross_val_score(modelo, X, y, cv=5, scoring='f1_macro')

# --- Reporte ---
clases = sorted(y.unique())
reporte = classification_report(y_test, y_pred)
cm = confusion_matrix(y_test, y_pred, labels=clases)
importancias = sorted(zip(FEATURES, modelo.feature_importances_), key=lambda x: -x[1])

texto = []
texto.append("=== DIAGNÓSTICO DE AJUSTE ===")
texto.append(f"Precisión en Entrenamiento: {acc_train*100:.2f}%")
texto.append(f"Precisión en Prueba (test): {acc_test*100:.2f}%")
texto.append(f"Brecha train-test: {(acc_train-acc_test)*100:.2f} pts")
texto.append(f"F1-macro cross-val (5 folds): {cv.mean():.3f} +/- {cv.std():.3f}")
texto.append("\n=== IMPORTANCIA DE VARIABLES ===")
for f, imp in importancias:
    texto.append(f"  {f}: {imp*100:.2f}%")
texto.append("\n=== MATRIZ DE CONFUSIÓN (filas=real, columnas=predicho) ===")
texto.append("Clases: " + str(clases))
texto.append(str(cm))
texto.append("\n=== REPORTE DE CLASIFICACIÓN ===")
texto.append(reporte)
reporte_final = "\n".join(texto)
print("\n" + reporte_final)

# --- Guardar artefactos ---
joblib.dump(modelo, 'backend/modelo_stress.pkl')
with open('backend/metricas.txt', 'w', encoding='utf-8') as f:
    f.write(reporte_final)

# Matriz de confusión (PNG)
fig, ax = plt.subplots(figsize=(5, 4))
ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=clases).plot(ax=ax, cmap='Blues')
ax.set_title('Matriz de Confusión - FlightRisk')
plt.tight_layout(); plt.savefig('backend/matriz_confusion.png', dpi=120); plt.close()

# Importancia de variables (PNG)
fig, ax = plt.subplots(figsize=(6, 4))
nombres = [f for f, _ in importancias][::-1]
valores = [i for _, i in importancias][::-1]
ax.barh(nombres, valores, color='#2563eb')
ax.set_title('Importancia de Variables (Random Forest)')
ax.set_xlabel('Importancia')
plt.tight_layout(); plt.savefig('backend/importancia_features.png', dpi=120); plt.close()

print("\nGuardado: modelo_stress.pkl, metricas.txt, matriz_confusion.png, importancia_features.png")
