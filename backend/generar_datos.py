import pandas as pd
import random
import time
import json
import os
from weather_api import obtener_riesgo_climatico_pronostico
from aviation_api import obtener_vuelos_reales

ARCHIVO_CACHE = 'backend/vuelos_cache.json'

# El diccionario oficial de tu equipo de scraping
TOP_50_AIRLINES = {
    "American Airlines": "american-airlines", "Delta Air Lines": "delta-air-lines",
    "United Airlines": "united-airlines", "Southwest Airlines": "southwest-airlines",
    "JetBlue Airways": "jetblue-airways", "Alaska Airlines": "alaska-airlines",
    "Air Canada": "air-canada", "WestJet": "westjet", "Aeromexico": "aeromexico",
    "LATAM Airlines": "latam-airlines", "Aerolineas Argentinas": "aerolineas-argentinas",
    "Avianca": "avianca", "Copa Airlines": "copa-airlines", "British Airways": "british-airways",
    "Virgin Atlantic": "virgin-atlantic-airways", "Lufthansa": "lufthansa",
    "Swiss International Air Lines": "swiss-international-air-lines", "Austrian Airlines": "austrian-airlines",
    "KLM Royal Dutch Airlines": "klm-royal-dutch-airlines", "Air France": "air-france",
    "Iberia": "iberia", "TAP Portugal": "tap-portugal", "Finnair": "finnair",
    "SAS Scandinavian Airlines": "sas-scandinavian-airlines", "Turkish Airlines": "turkish-airlines",
    "Ryanair": "ryanair", "easyJet": "easyjet", "Norwegian": "norwegian",
    "Emirates": "emirates-airline", "Qatar Airways": "qatar-airways",
    "Etihad Airways": "etihad-airways", "Oman Air": "oman-air", "Gulf Air": "gulf-air",
    "Saudia": "saudi-arabian-airlines", "Singapore Airlines": "singapore-airlines",
    "Cathay Pacific": "cathay-pacific-airways", "ANA All Nippon Airways": "ana-all-nippon-airways",
    "Japan Airlines": "japan-airlines", "Korean Air": "korean-air", "Asiana Airlines": "asiana-airlines",
    "EVA Air": "eva-air", "China Airlines": "china-airlines", "Air China": "air-china",
    "China Eastern Airlines": "china-eastern-airlines", "China Southern Airlines": "china-southern-airlines",
    "Hainan Airlines": "hainan-airlines", "Malaysia Airlines": "malaysia-airlines",
    "Thai Airways": "thai-airways", "Vietnam Airlines": "vietnam-airlines",
    "Air New Zealand": "air-new-zealand"
}

def generar_dataset_final():
    print("🚀 Iniciando el ensamblaje del Dataset de FlightRisk...")
    
    # 1. SISTEMA DE CACHÉ
    # Si quieres descargar vuelos nuevos, simplemente borra el archivo 'vuelos_cache.json'
    if os.path.exists(ARCHIVO_CACHE):
        print("📦 Leyendo vuelos desde la caché local (¡0 peticiones gastadas!)...")
        with open(ARCHIVO_CACHE, 'r') as f:
            vuelos_base = json.load(f)
    else:
        # Aumentamos a 500 para tener un buen margen después del filtro (Gasta 5 requests)
        print("🌐 Descargando lote grande de AviationStack (5 peticiones gastadas)...")
        vuelos_base = obtener_vuelos_reales(limite=50) 
        with open(ARCHIVO_CACHE, 'w') as f:
            json.dump(vuelos_base, f)
            
    if not vuelos_base:
        print("❌ No hay vuelos para procesar. Revisa tu API key.")
        return

    dataset_final = []
    vuelos_descartados = 0
    
    for i, vuelo in enumerate(vuelos_base):
        # 1. MATCH FLEXIBLE: Buscamos si la aerolínea está en tu lista de forma parcial
        airline_name = "Other"
        for top_name in TOP_50_AIRLINES.keys():
            if top_name.lower() in vuelo['airline'].lower():
                airline_name = top_name
                break

        lat_simulada = round(random.uniform(-50.0, 50.0), 4)
        lon_simulada = round(random.uniform(-100.0, 100.0), 4)
        
        # 3. CONEXIÓN A OPEN-METEO
        riesgo_clima = obtener_riesgo_climatico_pronostico(
            lat_simulada, lon_simulada, vuelo['fecha_completa_iso'][:16]
        )
        time.sleep(1.5) # Pausa obligatoria para Open-Meteo
        
        # 4. VARIABLES SIMULADAS (Hasta unir con el Scraping)
        sentiment = round(random.uniform(0.1, 1.0), 2)
        baggage_comp = random.randint(0, 30)
        delay_comp = random.randint(0, 40)
        conn_comp = random.randint(0, 20)
        
        # 5. CÁLCULO DEL STRESS LEVEL
        impacto_demora = min(vuelo['avg_delay_minutes'] / 120.0, 1.0) * 0.35
        impacto_clima = riesgo_clima * 0.25
        impacto_sentimiento = (1.0 - sentiment) * 0.20
        impacto_quejas = ((baggage_comp + delay_comp + conn_comp) / 90.0) * 0.20
        
        stress_total = impacto_demora + impacto_clima + impacto_sentimiento + impacto_quejas
        
        if stress_total < 0.35:
            stress_level = 'Low'
        elif stress_total < 0.65:
            stress_level = 'Medium'
        else:
            stress_level = 'High'
            
        dataset_final.append({
            'airline': airline_name,
            'origin_airport': vuelo['origin_airport'],
            'destination_airport': vuelo['destination_airport'],
            'avg_delay_minutes': vuelo['avg_delay_minutes'],
            'weather_risk': riesgo_clima,
            'sentiment_score': sentiment,
            'baggage_complaints': baggage_comp,
            'delay_complaints': delay_comp,
            'connection_complaints': conn_comp,
            'departure_hour': vuelo['departure_hour'],
            'Stress_Level': stress_level
        })
        
        if len(dataset_final) % 5 == 0:
            print(f"⏳ Procesados {len(dataset_final)} vuelos válidos del Top 50...")

    # 6. EXPORTAR A CSV
    df = pd.DataFrame(dataset_final)
    df.to_csv('backend/flights_dataset.csv', index=False)
    
    print(f"\n✅ ¡ÉXITO! Tu archivo 'flights_dataset.csv' definitivo ha sido creado.")
    print(f"📊 Resumen: {len(dataset_final)} vuelos guardados, {vuelos_descartados} vuelos ignorados (fuera del Top 50).")

if __name__ == "__main__":
    generar_dataset_final()


