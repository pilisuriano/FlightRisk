import pandas as pd
import numpy as np # Necesitamos numpy para algunas operaciones matemáticas si hicieran falta

# 1. Cargar todos tus CSVs de métricas por aerolínea
df_baggage = pd.read_csv('output/airlines_baggage.csv', sep=';')
df_sentiment = pd.read_csv('output/airlines_sentiment.csv', sep=';')
df_cancellations = pd.read_csv('output/airlines_cancellation.csv', sep=';')
df_connection = pd.read_csv('output/airlines_connection.csv', sep=';')
df_delay = pd.read_csv('output/airlines_delay.csv', sep=';')

# 2. Cargar tu dataset de vuelos operacionales (el que tiene origen, destino, clima, etc.)
df_vuelos = pd.read_csv('backend/flights_dataset.csv', sep=',')

# 3. Consolidar el "Perfil de la Aerolínea" (Merging de las métricas de scraping)
df_aerolineas = pd.merge(df_baggage[['airline', 'baggage_complaints']], 
                         df_sentiment[['airline', 'avg_sentiment']], 
                         on='airline', how='outer')

df_aerolineas = pd.merge(df_aerolineas, 
                         df_cancellations[['airline', 'cancellation_strict_rate']], 
                         on='airline', how='outer')

df_aerolineas = pd.merge(df_aerolineas, 
                         df_connection[['airline', 'connection_rate']], 
                         on='airline', how='outer')

df_aerolineas = pd.merge(df_aerolineas, 
                         df_delay[['airline', 'delay_rate']], 
                         on='airline', how='outer')

# 4. Fusión Final: Unir el perfil de las aerolíneas con los vuelos individuales
dataset_final = pd.merge(df_vuelos, df_aerolineas, on='airline', how='left')

# 5. Rellenar posibles datos faltantes (NaN) con promedios o ceros para que la IA no se rompa
dataset_final.fillna(0, inplace=True) 

# --- NUEVA SECCIÓN: CÁLCULO DEL STRESS SCORE ---

# 5.1 Crear tu Fórmula Lógica de Estrés
dataset_final['stress_score'] = (
    (dataset_final['avg_delay_minutes'] / 100) * 0.3 +  # Demora real 
    (dataset_final['weather_risk']) * 0.2 +             # Riesgo climático
    (1 - dataset_final['avg_sentiment']) * 0.2 +        # Sentimiento negativo
    (dataset_final['cancellation_strict_rate']) * 0.15 + # Cancelaciones
    (dataset_final['delay_rate']) * 0.15                # Reputación de demoras
)

# 5.2 Función para clasificar en Low, Medium, High
def clasificar_estres(score):
    if score < 0.35:
        return 'Low'
    elif score < 0.60:
        return 'Medium'
    else:
        return 'High'

# 5.3 Aplicar la función para crear la columna final
dataset_final['stress_level'] = dataset_final['stress_score'].apply(clasificar_estres)

# -----------------------------------------------

# 6. Guardar el dataset maestro que usará tu modelo de Machine Learning
dataset_final.to_csv('backend/flights_dataset_final.csv', index=False, sep=';')

print("¡Merge y cálculo de Stress Level completados con éxito!")
print("El dataset final está listo para entrenar el modelo.")
# Opcional: imprimir las primeras líneas para verificar
print(dataset_final[['airline', 'origin_airport', 'destination_airport', 'stress_score', 'stress_level']].head())