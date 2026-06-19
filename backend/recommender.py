import pandas as pd
import joblib

# cargar dataset
df = pd.read_csv("backend/flights_dataset_final.csv", sep=';')

# cargar modelo ya entrenado
model = joblib.load("backend/modelo_stress.pkl")


def recomendar_vuelos(origen, destino):

    candidatos = df[
        (df["origin_airport"] == origen) &
        (df["destination_airport"] == destino)
    ].copy()

    if candidatos.empty:
        return []

    # features que usa el modelo
    features = [
        "avg_delay_minutes",
        "weather_risk",
        "departure_hour"
    ]

    candidatos["pred"] = model.predict_proba(candidatos[features])[:, 1]

    candidatos = candidatos.sort_values("pred", ascending=True)

    return candidatos[[
        "airline",
        "origin_airport",
        "destination_airport",
        "pred"
    ]].to_dict(orient="records")