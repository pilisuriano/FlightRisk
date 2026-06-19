import pandas as pd
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

INPUT_FILE = "backend/reseñas_aerolineas_skytrax.csv"
OUTPUT_FILE = "output/reviews_with_sentiment.csv"

analyzer = SentimentIntensityAnalyzer()

df = pd.read_csv(INPUT_FILE, sep=";")

df["review_text"] = df["review_text"].fillna("")

df["sentiment_score"] = df["review_text"].apply(
    lambda text: analyzer.polarity_scores(str(text))["compound"]
)

df.to_csv(
    OUTPUT_FILE,
    sep=";",
    index=False,
    encoding="utf-8-sig"
)

print("Reviews procesadas")