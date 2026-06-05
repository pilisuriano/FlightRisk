import pandas as pd
import numpy as np

np.random.seed(42)
n_samples = 500

# Diccionario con coordenadas reales de aeropuertos
aeropuertos = {
    'EZE': {'lat': -34.8222, 'lon': -58.5358, 'name': 'Buenos Aires'},
    'MIA': {'lat': 25.7959, 'lon': -80.2870, 'name': 'Miami'},
    'JFK': {'lat': 40.6413, 'lon': -73.7781, 'name': 'New York'},
    'MAD': {'lat': 40.4839, 'lon': -3.5679, 'name': 'Madrid'},
    'GRU': {'lat': -23.4356, 'lon': -46.4731, 'name': 'São Paulo'}
}

# Generamos combinaciones aleatorias de origen y destino
origenes = np.random.choice(list(aeropuertos.keys()), n_samples)
destinos = np.random.choice(list(aeropuertos.keys()), n_samples)

# Evitamos que el origen sea igual al destino
for i in range(n_samples):
    while origenes[i] == destinos[i]:
        destinos[i] = np.random.choice(list(aeropuertos.keys()))

delay = np.random.poisson(lam=30, size=n_samples) 
weather = np.clip(np.random.weibull(1.5, size=n_samples) / 3, 0.0, 1.0) 
congestion = np.clip(np.random.normal(loc=0.5, scale=0.2, size=n_samples), 0.0, 1.0)
sentiment = np.clip(1 - (delay / 150) + np.random.normal(0, 0.1, size=n_samples), 0.0, 1.0)

stress_score = (delay/120 + weather + congestion + (1-sentiment)) / 4
stress = np.where(stress_score > 0.66, 'High', np.where(stress_score > 0.33, 'Medium', 'Low'))

# Armamos el DataFrame incluyendo las coordenadas de destino para el Heatmap
df = pd.DataFrame({
    'airline': np.random.choice(['LATAM', 'American Airlines', 'Iberia', 'Aerolineas Argentinas'], n_samples),
    'origin': origenes,
    'destination': destinos,
    'dest_lat': [aeropuertos[d]['lat'] for d in destinos],
    'dest_lon': [aeropuertos[d]['lon'] for d in destinos],
    'delay': delay,
    'weather': weather,
    'congestion': congestion,
    'sentiment': sentiment,
    'stress': stress
})

df.to_csv('backend/flights_dataset.csv', index=False)
print("¡Dataset con coordenadas geográficas generado!")
