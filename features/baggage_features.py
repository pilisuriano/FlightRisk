import pandas as pd

INPUT_FILE = "backend/reseñas_aerolineas_skytrax.csv"
OUTPUT_FILE = "output/airlines_baggage.csv"

BAGGAGE_COMPLAINT_PATTERNS = [
    "lost baggage",
    "lost luggage",
    "lost bag",
    "missing baggage",
    "missing luggage",
    "missing bag",
    "damaged baggage",
    "damaged luggage",
    "delayed baggage",
    "delayed luggage",
    "bag never arrived",
    "baggage never arrived",
    "luggage never arrived",
    "lost my bag",
    "lost our bag",
    "lost my luggage",
    "lost our luggage",
    "baggage claim issue",
    "baggage problem",
    "luggage problem",
    "wrong baggage",
    "wrong luggage",
    "bag did not arrive",
    "luggage did not arrive",
    "baggage did not arrive"
]

df = pd.read_csv(INPUT_FILE, sep=";")

# limpieza
df = df[df["airline"].notna()]
df = df[df["airline"].astype(str).str.strip() != ""]

# eliminar fila corrupta del scraping
df = df[
    ~df["airline"].astype(str).str.contains(
        "Trip Verified",
        na=False
    )
]

df["review_text"] = (
    df["review_text"]
    .fillna("")
    .astype(str)
    .str.lower()
)

def baggage_complaint(text):
    for pattern in BAGGAGE_COMPLAINT_PATTERNS:
        if pattern in text:
            return 1

    return 0

df["baggage_complaint"] = df["review_text"].apply(
    baggage_complaint
)

result = (
    df.groupby("airline")
    .agg(
        baggage_complaints=("baggage_complaint", "sum"),
        review_count=("baggage_complaint", "count")
    )
    .reset_index()
)

result["baggage_rate"] = (
    result["baggage_complaints"]
    / result["review_count"]
)

result = result.sort_values(
    "baggage_rate",
    ascending=False
)

result.to_csv(
    OUTPUT_FILE,
    sep=";",
    index=False,
    encoding="utf-8-sig"
)

print("\n=== TOP 20 BAGGAGE COMPLAINTS ===")
print(result.head(20))

print(f"\nArchivo generado: {OUTPUT_FILE}")