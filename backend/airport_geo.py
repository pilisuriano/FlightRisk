import pandas as pd
import os

DATA_PATH = "backend/world_airports.csv"

AIRPORTS = {}


def load_airports():
    global AIRPORTS

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError("No existe airports.csv")

    df = pd.read_csv(DATA_PATH)

    df = df.dropna(subset=["IATA_CODE", "LATITUDE", "LONGITUDE"])

    for _, row in df.iterrows():
        iata = str(row["IATA_CODE"]).upper().strip()

        if iata == "\\N":
            continue

        AIRPORTS[iata] = (
            float(row["LATITUDE"]),
            float(row["LONGITUDE"]),
            str(row.get("CITY", "")),
            str(row.get("COUNTRY", "")),
        )

    print(f"🌍 Aeropuertos cargados: {len(AIRPORTS)}")


def get_airport_coords(iata: str):
    if not AIRPORTS:
        load_airports()

    data = AIRPORTS.get(iata.upper())
    if not data:
        return None

    return data[0], data[1]


def get_airport_info(iata: str):
    if not AIRPORTS:
        load_airports()

    data = AIRPORTS.get(iata.upper())
    if not data:
        return None

    lat, lon, city, country = data

    return {
        "iata": iata.upper(),
        "lat": lat,
        "lon": lon,
        "city": city,
        "country": country
    }