import pandas as pd
import numpy as np
import random

def generar_datos_sinteticos(num_filas=500):
    # Opciones basadas en la documentación oficial
    airlines = ['Aerolineas Argentinas', 'Flybondi', 'JetSmart', 'Iberia', 'Air Europa', 'Level']
    airports = ['EZE', 'AEP', 'MAD', 'BRC', 'MIA', 'GRU']
    seasons = ['Summer', 'Autumn', 'Winter', 'Spring']
    
    data = []
    
    for _ in range(num_filas):
        # Variables categóricas
        airline = random.choice(airlines)
        origin = random.choice(airports)
        # Evitar que origen y destino sean el mismo
        destination = random.choice([a for a in airports if a != origin])
        season = random.choice(seasons)
        
        # Variables numéricas 
        avg_delay = round(np.random.uniform(0, 180), 1) # Demora en minutos
        cancellation_rate = round(np.random.uniform(0, 0.2), 3) # Probabilidad de 0 a 20%
        connection_time = random.choice([0, 60, 120, 180, 240]) # En minutos (0 si es directo)
        congestion = round(np.random.uniform(0, 1), 2) # Escala 0 a 1
        weather = round(np.random.uniform(0, 1), 2) # Escala 0 a 1
        sentiment = round(np.random.uniform(0, 1), 2) # Escala 0 a 1 (1 es muy bueno)
        baggage_complaints = random.randint(0, 50) # Cantidad de quejas
        departure_hour = random.randint(0, 23) # Hora de 0 a 23
        
        # Fórmula lógica simple para el Stress Score (Mocking)
        # delays altos -> suma, clima malo -> suma, sentimiento negativo -> suma
        stress_value = (avg_delay / 180) + congestion + weather + (1 - sentiment) + (cancellation_rate * 5)
        
        if stress_value < 1.5:
            stress_level = 'Low'
        elif stress_value < 2.8:
            stress_level = 'Medium'
        else:
            stress_level = 'High'
            
        data.append([
            airline, origin, destination, avg_delay, cancellation_rate, 
            connection_time, congestion, weather, sentiment, 
            baggage_complaints, departure_hour, season, stress_level
        ])
        
    # Crear DataFrame y exportar a CSV
    columnas = [
        'airline', 'origin_airport', 'destination_airport', 'avg_delay_minutes', 
        'cancellation_rate', 'connection_time', 'airport_congestion', 
        'weather_risk', 'sentiment_score', 'baggage_complaints', 
        'departure_hour', 'season_month', 'Stress_Level'
    ]
    
    df = pd.DataFrame(data, columns=columnas)
    # Guardamos el archivo que el Backend y el Frontend consumirán
    df.to_csv('backend/flights_dataset.csv', index=False)
    print(f"✅ Se generaron {num_filas} vuelos exitosamente en 'backend/flights_dataset.csv'.")

if __name__ == "__main__":
    generar_datos_sinteticos()