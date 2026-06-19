import pandas as pd

INPUT_FILE = "output/reviews_with_sentiment.csv"
OUTPUT_FILE = "output/airlines_sentiment.csv"

df = pd.read_csv(INPUT_FILE, sep=";")

bad_rows = df[
    df["airline"].astype(str).str.contains(
        "Trip Verified",
        na=False
    )
]

print(bad_rows[["airline"]])

df = df[df["airline"].notna()]
df = df[df["airline"].astype(str).str.strip() != ""]

df = df[
    ~df["airline"].astype(str).str.contains(
        "Trip Verified",
        na=False
    )
]

print("\n=== COLUMNAS ===")
print(df.columns.tolist())

print("\n=== PRIMERAS 5 FILAS ===")
print(df.head())

print("\n=== AIRLINES NULAS ===")
print(df[df["airline"].isna()])

print("\n=== AIRLINES VACIAS ===")
print(df[df["airline"].astype(str).str.strip() == ""])

# Limpiar registros inválidos
df = df[df["airline"].notna()]
df = df[df["airline"].astype(str).str.strip() != ""]

result = (
    df.groupby("airline")
    .agg(
        avg_sentiment=("sentiment_score", "mean"),
        review_count=("sentiment_score", "count"),
        avg_rating=("rating", "mean")
    )
    .reset_index()
)

result.to_csv(
    OUTPUT_FILE,
    sep=";",
    index=False,
    encoding="utf-8-sig"
)

print("\n=== RESULTADO ===")
print(result.head())

print("\nSentimiento por aerolínea generado")