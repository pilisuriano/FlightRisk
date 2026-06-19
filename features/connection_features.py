import pandas as pd

INPUT_FILE = "backend/reseñas_aerolineas_skytrax.csv"
OUTPUT_FILE = "output/airlines_connection.csv"

CONNECTION_PATTERNS = [
    "missed connection",
    "missed my connection",
    "missed connecting flight",
    "connection missed",
    "tight connection",
    "very tight connection",
    "short connection",
    "short layover",
    "layover too short",
    "connection time too short",
    "could not make connection",
    "unable to make connection",
    "rebooked due to missed connection",
    "stranded at airport",
    "overnight at airport",
    "stuck at airport",
    "connection delayed",
    "connecting flight delayed",
    "connection issue",
    "connection problem"
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

# detector binario por review
def connection_issue(text):
    for pattern in CONNECTION_PATTERNS:
        if pattern in text:
            return 1
    return 0

df["connection_issue"] = df["review_text"].apply(connection_issue)

# agregación por aerolínea
result = (
    df.groupby("airline")
    .agg(
        connection_issues=("connection_issue", "sum"),
        review_count=("connection_issue", "count")
    )
    .reset_index()
)

# tasa normalizada
result["connection_rate"] = (
    result["connection_issues"] / result["review_count"]
)

# ordenar para análisis
result = result.sort_values(
    "connection_rate",
    ascending=False
)

# export
result.to_csv(
    OUTPUT_FILE,
    sep=";",
    index=False,
    encoding="utf-8-sig"
)

print("\n=== TOP 20 CONNECTION ISSUES ===")
print(result.head(20))

print(f"\nArchivo generado: {OUTPUT_FILE}")