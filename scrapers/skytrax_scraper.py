import time
import requests
import pandas as pd
from bs4 import BeautifulSoup

from airlines import TOP_50_AIRLINES

BASE_URL = "https://www.airlinequality.com/airline-reviews/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Referer": "https://www.google.com/"
}

reviews_data = []

for airline, slug in TOP_50_AIRLINES.items():

    print(f"\nScrapeando {airline}")

    # 5 páginas por aerolínea
    for page in range(1, 6):

        url = f"{BASE_URL}{slug}/page/{page}/"
        print(url)

        try:
            response = requests.get(
                url,
                headers=HEADERS,
                timeout=20
            )

            if response.status_code != 200:
                print(f"Error {response.status_code}")
                continue

            soup = BeautifulSoup(
                response.text,
                "html.parser"
            )

            reviews = soup.select("article")

            print(
                f"Página {page}: "
                f"{len(reviews)} reviews"
            )

            for review in reviews:

                text = review.get_text(
                    " ",
                    strip=True
                )

                reviews_data.append({
                    "airline": airline,
                    "review_text": text
                })

            time.sleep(1)

        except Exception as e:
            print(
                f"Error en {airline}: {e}"
            )

df = pd.DataFrame(reviews_data)

print(df.head())

df.to_csv(
    "output/reviews.csv",
    index=False,
    encoding="utf-8-sig"
)

print(
    f"\nTotal reviews: {len(df)}"
)