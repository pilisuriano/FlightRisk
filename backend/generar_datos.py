import pandas as pd
import numpy as np

# Semilla para que los resultados sean reproducibles
np.random.seed(42)
n_samples = 500

# 1. Aplicamos distribuciones de probabilidad
# Poisson para los retrasos (media de 30 minutos)
delay = np.random.poisson(lam=30, size=n_samples) 

# Weibull para la severidad del clima (eventos extremos)
weather = np.random.weibull(1.5, size=n_samples) / 3 
weather = np.clip(weather, 0.0, 1.0) # Normalizamos entre 0 y 1

# Distribución normal para la congestión
congestion = np.random.normal(loc=0.5, scale=0.2, size=n_samples)
congestion = np.clip(congestion, 0.0, 1.0)

# Sentimiento en redes (inversamente proporcional al retraso)
sentiment = 1 - (delay / 150) + np.random.normal(0, 0.1, size=n_samples)
sentiment = np.clip(sentiment, 0.0, 1.0)

# 2. Asignamos la etiqueta real para que el modelo aprenda
stress_score = (delay/120 + weather + congestion + (1-sentiment)) / 4
stress = np.where(stress_score > 0.66, 'High', np.where(stress_score > 0.33, 'Medium', 'Low'))

# 3. Armamos el DataFrame
df = pd.DataFrame({
    'airline': np.random.choice(['LATAM', 'American Airlines', 'Iberia', 'Aerolineas Argentinas'], n_samples),
    'origin': 'EZE',
    'destination': 'MIA',
    'delay': delay,
    'weather': weather,
    'congestion': congestion,
    'sentiment': sentiment,
    'stress': stress
})

# 4. Sobrescribimos nuestro CSV temporal
df.to_csv('backend/flights_dataset.csv', index=False)
print("¡Dataset estadístico de 500 vuelos generado con éxito!")
