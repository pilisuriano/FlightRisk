import pandas as pd

INPUT_FILE = "backend/reseñas_aerolineas_skytrax.csv"
OUTPUT_FILE = "output/airlines_delay.csv"

DELAY_PATTERNS = [
    "delay",
    "delayed",
    "flight delayed",
    "hours late",
    "late departure",
    "late arrival",
    "maintenance delay",
    "departure delay",
    "arrival delay",
    "missed due to delay",
    "long delay",
    "delayed for",
    "delay of",
    "waited for hours"
]

df = pd.read_csv(INPUT_FILE, sep=";")

df = df[df["airline"].notna()]
df = df[df["airline"].astype(str).str.strip() != ""]

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

def delay_complaint(text):
    for pattern in DELAY_PATTERNS:
        if pattern in text:
            return 1
    return 0

df["delay_complaint"] = df["review_text"].apply(
    delay_complaint
)

result = (
    df.groupby("airline")
    .agg(
        delay_complaints=("delay_complaint", "sum"),
        review_count=("delay_complaint", "count")
    )
    .reset_index()
)

result["delay_rate"] = (
    result["delay_complaints"]
    / result["review_count"]
)

result = result.sort_values(
    "delay_rate",
    ascending=False
)

result.to_csv(
    OUTPUT_FILE,
    sep=";",
    index=False,
    encoding="utf-8-sig"
)

print(result.head(20))