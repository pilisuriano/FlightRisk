import requests

def obtener_riesgo_climatico_pronostico(lat: float, lon: float, fecha_hora_iso: str) -> float:
    """
    Se conecta a Open-Meteo para obtener el pronóstico.
    """
    # --- AQUÍ VA EL CAMBIO ---
    # Cortamos el string en el carácter 13 para quedarnos solo con 'YYYY-MM-DDTHH'
    # y le agregamos ':00' para normalizar a la hora en punto.
    fecha_normalizada = fecha_hora_iso[:13] + ":00"
    # --------------------------
    
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=precipitation,wind_speed_10m"
    
    try:
        respuesta = requests.get(url, timeout=5)
        respuesta.raise_for_status()
        datos = respuesta.json()
        
        tiempos = datos.get("hourly", {}).get("time", [])
        
        # Ahora comparamos contra la fecha normalizada
        if fecha_normalizada not in tiempos:
            print(f"⚠️ Aviso: La fecha {fecha_normalizada} no está en el rango.")
            return 0.5 
            
        indice = tiempos.index(fecha_normalizada)
        
        # Usamos ese índice para sacar la lluvia y viento exactos de esa hora
        precipitacion = datos["hourly"]["precipitation"][indice]
        viento = datos["hourly"]["wind_speed_10m"][indice]
        
        # Implementamos la fórmula de riesgo que ya calibramos
        factor_precipitacion = precipitacion / 50.0
        factor_viento = viento / 100.0
        
        riesgo_total = factor_precipitacion + factor_viento
        
        # Nos aseguramos de que el riesgo no supere 1.0
        return round(min(1.0, riesgo_total), 2)

    except Exception as e:
        print(f"❌ Error conectando a Open-Meteo: {e}")
        return 0.5

# --- Bloque de Prueba ---
if __name__ == "__main__":
    # Coordenadas de Buenos Aires (EZE)
    lat_eze = -34.8222
    lon_eze = -58.5358
    
    # Simulamos un vuelo para el 20 de junio de 2026 a las 15:00 hs
    # Open-Meteo requiere que las horas sean en punto (:00) y separadas por una 'T'
    fecha_vuelo_futuro = "2026-06-20T15:00"
    
    riesgo = obtener_riesgo_climatico_pronostico(lat_eze, lon_eze, fecha_vuelo_futuro)
    print(f"🌍 Evaluando pronóstico para EZE el {fecha_vuelo_futuro}...")
    print(f"🌩️ El weather_risk predicho para la hora del despegue es: {riesgo}")