import pandas as pd
import numpy as np  # Necesitamos numpy para ruido

# 1. Cargar todos tus CSVs de métricas por aerolínea
df_baggage = pd.read_csv('output/airlines_baggage.csv', sep=';')
df_sentiment = pd.read_csv('output/airlines_sentiment.csv', sep=';')
df_cancellations = pd.read_csv('output/airlines_cancellation.csv', sep=';')
df_connection = pd.read_csv('output/airlines_connection.csv', sep=';')
df_delay = pd.read_csv('output/airlines_delay.csv', sep=';')

# 2. Cargar tu dataset de vuelos operacionales
df_vuelos = pd.read_csv('backend/flights_dataset.csv', sep=',')

# 3. Consolidar el "Perfil de la Aerolínea"
df_aerolineas = pd.merge(
    df_baggage[['airline', 'baggage_complaints']],
    df_sentiment[['airline', 'avg_sentiment']],
    on='airline',
    how='outer'
)

df_aerolineas = pd.merge(
    df_aerolineas,
    df_cancellations[['airline', 'cancellation_strict_rate']],
    on='airline',
    how='outer'
)

df_aerolineas = pd.merge(
    df_aerolineas,
    df_connection[['airline', 'connection_rate']],
    on='airline',
    how='outer'
)

df_aerolineas = pd.merge(
    df_aerolineas,
    df_delay[['airline', 'delay_rate']],
    on='airline',
    how='outer'
)

# 4. Fusión final con vuelos
dataset_final = pd.merge(df_vuelos, df_aerolineas, on='airline', how='left')

# 5. Rellenar NaN
dataset_final.fillna(0, inplace=True)

# =========================
# STRESS SCORE (TU MODELO)
# =========================

dataset_final['stress_score'] = (
    (dataset_final['avg_delay_minutes'] / 100) * 0.3 +
    (dataset_final['weather_risk']) * 0.2 +
    (1 - dataset_final['avg_sentiment']) * 0.2 +
    (dataset_final['cancellation_strict_rate']) * 0.15 +
    (dataset_final['delay_rate']) * 0.15
)

# =========================
# 🔥 INYECCIÓN DE RUIDO (ACÁ VA)
# =========================

np.random.seed(42)

ruido = np.random.normal(
    0,
    0.07,
    size=len(dataset_final)
)

dataset_final['stress_score'] = (
    dataset_final['stress_score'] + ruido
).clip(0, 1)

# =========================
# CLASIFICACIÓN
# =========================

def clasificar_estres(score):
    if score < 0.35:
        return 'Low'
    elif score < 0.60:
        return 'Medium'
    else:
        return 'High'

dataset_final['stress_level'] = dataset_final['stress_score'].apply(clasificar_estres)

# =========================
# EXPORT FINAL
# =========================

dataset_final.to_csv(
    'backend/flights_dataset_final.csv',
    index=False,
    sep=';'
)

print("¡Merge y cálculo de Stress Level completados con éxito!")
print("El dataset final está listo para entrenar el modelo.")

print(dataset_final[['airline', 'origin_airport', 'destination_airport', 'stress_score', 'stress_level']].head())