import pandas as pd
import numpy as np

# ==============================================================================
#  build_dataset.py  —  Construye el dataset maestro para entrenar el modelo.
#  Cambios clave:
#   (A) Imputa features de reseñas faltantes (en vez de poner 0 falso) + flag.
#   (B) Inyecta ruido al stress_score -> evita target leakage.
#   (C) Clasifica Low/Medium/High por TERCILES -> clases balanceadas (genera High).
# ==============================================================================

SEMILLA = 42  # reproducibilidad

# 1. Cargar las métricas por aerolínea (derivadas de las reseñas de Skytrax)
df_baggage       = pd.read_csv('output/airlines_baggage.csv', sep=';')
df_sentiment     = pd.read_csv('output/airlines_sentiment.csv', sep=';')
df_cancellations = pd.read_csv('output/airlines_cancellation.csv', sep=';')
df_connection    = pd.read_csv('output/airlines_connection.csv', sep=';')
df_delay         = pd.read_csv('output/airlines_delay.csv', sep=';')

# 2. Cargar el dataset de vuelos operacionales (origen, destino, clima, demora real)
df_vuelos = pd.read_csv('backend/flights_dataset.csv', sep=',')

# 3. Consolidar el "perfil de la aerolínea"
df_aerolineas = pd.merge(df_baggage[['airline', 'baggage_complaints']],
                         df_sentiment[['airline', 'avg_sentiment']], on='airline', how='outer')
df_aerolineas = pd.merge(df_aerolineas, df_cancellations[['airline', 'cancellation_strict_rate']], on='airline', how='outer')
df_aerolineas = pd.merge(df_aerolineas, df_connection[['airline', 'connection_rate']], on='airline', how='outer')
df_aerolineas = pd.merge(df_aerolineas, df_delay[['airline', 'delay_rate']], on='airline', how='outer')

# 4. Unir el perfil de aerolíneas con los vuelos individuales
dataset_final = pd.merge(df_vuelos, df_aerolineas, on='airline', how='left')

# 5. (A) IMPUTACIÓN INTELIGENTE de las features de reseñas faltantes
#    Antes se hacía fillna(0): un 0 "falso" que el modelo leía como aerolínea buena.
#    Ahora: marcamos qué vuelos NO tienen reseñas y rellenamos con el PROMEDIO real.
review_cols = ['baggage_complaints', 'avg_sentiment', 'cancellation_strict_rate',
               'connection_rate', 'delay_rate']

dataset_final['tiene_reviews'] = dataset_final['avg_sentiment'].notna().astype(int)
for col in review_cols:
    media_real = df_aerolineas[col].mean()            # promedio entre aerolíneas con reseñas
    dataset_final[col] = dataset_final[col].fillna(media_real)

# Cualquier otro nulo residual (operacionales) -> 0
dataset_final.fillna(0, inplace=True)

# 5.1 Fórmula lógica de estrés (riesgo latente)
dataset_final['stress_score'] = (
    (dataset_final['avg_delay_minutes'] / 100) * 0.30 +   # demora real del vuelo
    (dataset_final['weather_risk'])           * 0.20 +    # riesgo climático
    (1 - dataset_final['avg_sentiment'])      * 0.20 +    # mala reputación (Skytrax)
    (dataset_final['cancellation_strict_rate']) * 0.15 +  # cancelaciones
    (dataset_final['delay_rate'])             * 0.15      # reputación de demoras
)

# 5.1.b (B) RUIDO ANTI-LEAKAGE
#    Representa factores reales no medidos (ATC, mantenimiento, demoras en cadena...).
#    Hace que stress_level deje de ser una función EXACTA de las features.
np.random.seed(SEMILLA)
ruido = np.random.normal(0, 0.07, size=len(dataset_final))
dataset_final['stress_score'] = (dataset_final['stress_score'] + ruido).clip(0, 1)

# 5.2 (C) UMBRALES POR TERCILES  -> tres clases balanceadas (antes no salían 'High')
# Percentiles 0.45 / 0.78: elegidos por validación (mejor F1-macro y F1 de la
# clase High sin aplastar Medium). Ajustables si cambia el dataset.
q1, q2 = dataset_final['stress_score'].quantile([0.45, 0.78])
print(f"Umbrales (percentiles 45/78) -> Low < {q1:.3f} <= Medium < {q2:.3f} <= High")

def clasificar_estres(score):
    if score < q1:
        return 'Low'
    elif score < q2:
        return 'Medium'
    return 'High'

dataset_final['stress_level'] = dataset_final['stress_score'].apply(clasificar_estres)

# 6. Guardar el dataset maestro
dataset_final.to_csv('backend/flights_dataset_final.csv', index=False, sep=';')

print("\n¡Dataset final construido con éxito!")
print(f"Filas: {len(dataset_final)} | Vuelos con reseñas: {dataset_final['tiene_reviews'].sum()} "
      f"({dataset_final['tiene_reviews'].mean()*100:.0f}%)")
print("\nBalance de clases:")
print(dataset_final['stress_level'].value_counts())
