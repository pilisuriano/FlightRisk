import requests
import random
from datetime import datetime

# TODO: Pega tu API Key real de AviationStack aquí
AVIATION_API_KEY = "8f1ba0ed59efd2bde42c82d314d0b1ca" 

def obtener_vuelos_reales(limite=50):
    print("🛫 Conectando a AviationStack para obtener vuelos reales...")
    url = f"https://api.aviationstack.com/v1/flights?access_key={AVIATION_API_KEY}&limit={limite}"
    
    try:
        respuesta = requests.get(url, timeout=10)
        respuesta.raise_for_status()
        datos = respuesta.json()
        
        vuelos_procesados = []
        
        for vuelo in datos.get('data', []):
            airline = vuelo.get('airline', {}).get('name')
            origin = vuelo.get('departure', {}).get('iata')
            destination = vuelo.get('arrival', {}).get('iata')
            
            # 1. LIMPIEZA DE DATOS: Filtramos aerolíneas vacías o vuelos sin sentido
            if not origin or not destination or not airline or airline == 'empty' or origin == destination:
                continue
                
            dep_time_str = vuelo['departure']['scheduled']
            if dep_time_str:
                fecha_obj = datetime.fromisoformat(dep_time_str.replace('Z', '+00:00'))
                departure_hour = fecha_obj.hour
            else:
                departure_hour = 12
                
            # 2. LÓGICA DE DEMORAS (Realidad Mixta)
            delay = vuelo['departure'].get('delay')
            if delay:
                # Si la API capturó un delay real, lo usamos
                avg_delay_minutes = float(delay)
            else:
                # Si es 0 (vuelo a futuro), simulamos un delay realista para entrenar la IA
                # 30% de los vuelos tendrán demora
                if random.random() < 0.30:
                    avg_delay_minutes = float(random.randint(15, 120))
                else:
                    avg_delay_minutes = 0.0
            
            vuelo_limpio = {
                'airline': airline,
                'origin_airport': origin,
                'destination_airport': destination,
                'departure_hour': departure_hour,
                'avg_delay_minutes': avg_delay_minutes,
                'fecha_completa_iso': dep_time_str
            }
            
            vuelos_procesados.append(vuelo_limpio)
            
        print(f"✅ Se obtuvieron {len(vuelos_procesados)} vuelos reales y limpios con éxito.")
        return vuelos_procesados

    except Exception as e:
        print(f"❌ Error conectando a AviationStack: {e}")
        return []

# --- Bloque de Prueba ---
if __name__ == "__main__":
    vuelos = obtener_vuelos_reales(limite=10)
    for v in vuelos:
        print(v)
