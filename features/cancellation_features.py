import pandas as pd

INPUT_FILE = "backend/reseñas_aerolineas_skytrax.csv"
OUTPUT_FILE = "output/airlines_cancellation.csv"

# 🔴 Cancelación estricta (solo cancelación real)
CANCELLATION_STRICT_PATTERNS = [
    "flight was cancelled",
    "flight was canceled",
    "cancelled flight",
    "canceled flight",
    "my flight was cancelled",
    "my flight was canceled",
    "flight cancellation",
    "cancellation of flight",
    "last minute cancellation",
    "flight got cancelled",
    "flight got canceled"
]

# 🟡 Disruption más amplio (opcional pero MUY útil para el modelo)
DISRUPTION_PATTERNS = [
    "cancelled",
    "canceled",
    "rebooked",
    "rebook",
    "re-routing",
    "rerouted",
    "rescheduled",
    "changed flight",
    "missed flight due to cancellation"
]

df = pd.read_csv(INPUT_FILE, sep=";")

# limpieza base
df = df[df["airline"].notna()]
df = df[df["airline"].astype(str).str.strip() != ""]

# eliminar fila corrupta del scraping
df = df[
    ~df["airline"].astype(str).str.contains(
        "Trip Verified",
        na=False
    )
]

# normalizar texto
df["review_text"] = (
    df["review_text"]
    .fillna("")
    .astype(str)
    .str.lower()
)

# 🔴 cancelación estricta
def cancellation_strict(text):
    for pattern in CANCELLATION_STRICT_PATTERNS:
        if pattern in text:
            return 1
    return 0

# 🟡 disruption general
def disruption(text):
    for pattern in DISRUPTION_PATTERNS:
        if pattern in text:
            return 1
    return 0

df["cancellation_strict"] = df["review_text"].apply(cancellation_strict)
df["disruption"] = df["review_text"].apply(disruption)

result = (
    df.groupby("airline")
    .agg(
        cancellation_strict_count=("cancellation_strict", "sum"),
        disruption_count=("disruption", "sum"),
        review_count=("cancellation_strict", "count")
    )
    .reset_index()
)

# rates finales
result["cancellation_strict_rate"] = (
    result["cancellation_strict_count"] / result["review_count"]
)

result["disruption_rate"] = (
    result["disruption_count"] / result["review_count"]
)

# orden útil para análisis
result = result.sort_values(
    "cancellation_strict_rate",
    ascending=False
)

result.to_csv(
    OUTPUT_FILE,
    sep=";",
    index=False,
    encoding="utf-8-sig"
)

print("\n=== TOP 20 CANCELLATION STRICT ===")
print(result.head(20))

print(f"\nArchivo generado: {OUTPUT_FILE}")